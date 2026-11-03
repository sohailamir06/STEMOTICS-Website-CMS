import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TimeSlot } from '../../src/models/TimeSlot.js';
import { Course } from '../../src/models/Course.js';
import { FilterOption } from '../../src/models/FilterOption.js';
import { seedCatalog } from '../../src/seed/seedCatalog.js';
import { clearDb, signInAs, startDb, stopDb, testApp } from '../helpers.js';

const app = testApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  await seedCatalog();
});

const listCourses = (query = '') => request(app).get(`/api/v1/courses${query}`);
const titles = (res) => res.body.courses.map((course) => course.title);

describe('seed', () => {
  it('creates the brief §6 filters, the live-site time slots and 12 regular programs', async () => {
    const res = await request(app).get('/api/v1/filters');
    expect(res.body.groups.map((group) => group.name)).toEqual([
      'Courses',
      'Age Level',
      'Course Categories',
      'Difficulty',
      'School Workshop Categories'
    ]);
    expect(await TimeSlot.countDocuments()).toBe(20);
    expect(await Course.countDocuments()).toBe(12);
  });

  it('is safe to re-run and never overwrites staff edits', async () => {
    await Course.updateOne({ code: 'STC2001' }, { $set: { title: 'Edited by staff' } });
    const created = await seedCatalog();
    expect(created).toEqual({ filterGroups: 0, filterOptions: 0, timeSlots: 0, courses: 0 });
    expect((await Course.findOne({ code: 'STC2001' })).title).toBe('Edited by staff');
  });
});

describe('course listing filters (Brief §6)', () => {
  it('lists all active courses alphabetically when nothing is selected', async () => {
    const res = await listCourses();
    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(12);
    expect(titles(res)[0]).toBe('Coding Junior');
  });

  it('uses OR within a group and AND across groups (FIL-02)', async () => {
    const res = await listCourses(
      '?course-categories=robotics&course-categories=coding&age-level=ages-6-8'
    );
    expect(titles(res)).toEqual(['Coding Junior', 'Robotics Junior']);
    expect(res.body.selected).toEqual({
      'course-categories': ['robotics', 'coding'],
      'age-level': ['ages-6-8']
    });
  });

  it('accepts comma-separated values', async () => {
    const res = await listCourses('?course-categories=robotics,coding&age-level=ages-6-8');
    expect(titles(res)).toEqual(['Coding Junior', 'Robotics Junior']);
  });

  it('ignores unknown groups and options', async () => {
    const res = await listCourses('?colour=blue&age-level=not-an-age');
    expect(res.body.courses).toHaveLength(12);
    expect(res.body.selected).toEqual({});
  });

  it('hides inactive courses', async () => {
    await Course.updateOne({ code: 'STC2001' }, { $set: { isActive: false } });
    expect(titles(await listCourses())).not.toContain('Coding Junior');
    expect((await request(app).get('/api/v1/courses/coding-junior')).status).toBe(404);
  });

  it('returns tags for course cards', async () => {
    const res = await listCourses('?difficulty=basic');
    expect(titles(res)).toEqual(['Coding Junior']);
    expect(res.body.courses[0].tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ group: 'age-level', label: 'Ages 6-8' }),
        expect.objectContaining({ group: 'difficulty', label: 'Basic' })
      ])
    );
  });
});

describe('course detail with shared time slots (Brief §1, §12)', () => {
  it('returns levels, price and time slots in weekday order', async () => {
    const res = await request(app).get('/api/v1/courses/coding-junior');
    expect(res.status).toBe(200);
    const { course } = res.body;
    expect(res.headers['cache-control']).toBe('no-store');
    expect(course.monthlyFee).toBe(12999);
    expect(course.levels.map((level) => level.code)).toEqual([
      'STC2001',
      'STC2002',
      'STC2003',
      'STC2004'
    ]);
    expect(course.timeSlots).toHaveLength(20);
    expect(course.timeSlots[0]).toMatchObject({
      dayOfWeek: 1,
      label: 'Monday 5:00 – 6:00 PM',
      seatsLeft: 9,
      isFull: false
    });
    expect(course.timeSlots.at(-1).label).toBe('Saturday 2:00 – 3:00 PM');
    expect(course.timeSlots[0].capacity).toBeUndefined(); // admin-only field
  });

  it('shows a full slot as full on EVERY program that offers it (CAP-02)', async () => {
    await TimeSlot.updateOne({ dayOfWeek: 1, startTime: '17:00' }, { $set: { occupiedCount: 9 } });
    for (const slug of ['coding-junior', 'robotics-senior', 'game-design-junior']) {
      const { course } = (await request(app).get(`/api/v1/courses/${slug}`)).body;
      expect(course.timeSlots[0]).toMatchObject({ seatsLeft: 0, isFull: true });
      expect(course.timeSlots[1]).toMatchObject({ seatsLeft: 9, isFull: false }); // Mon 6 PM unaffected (CAP-09)
    }
  });

  it('hides inactive time slots', async () => {
    await TimeSlot.updateOne({ dayOfWeek: 1, startTime: '17:00' }, { $set: { isActive: false } });
    const { course } = (await request(app).get('/api/v1/courses/coding-junior')).body;
    expect(course.timeSlots).toHaveLength(19);
  });
});

describe('admin: time slots', () => {
  it('creates a slot with the default capacity of 9 and a readable label', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const res = await request(app)
      .post('/api/v1/admin/time-slots')
      .set('Cookie', cookie)
      .send({ dayOfWeek: 7, startTime: '13:00', endTime: '14:00' });
    expect(res.status).toBe(201);
    expect(res.body.timeSlot).toMatchObject({
      capacity: 9,
      label: 'Sunday 1:00 – 2:00 PM',
      isFull: false
    });
  });

  it('rejects a duplicate day and start time', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const res = await request(app)
      .post('/api/v1/admin/time-slots')
      .set('Cookie', cookie)
      .send({ dayOfWeek: 1, startTime: '17:00', endTime: '18:00' });
    expect(res.status).toBe(409);
  });

  it('reopens a full slot when staff raise the capacity (CAP-04)', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const slot = await TimeSlot.findOneAndUpdate(
      { dayOfWeek: 1, startTime: '17:00' },
      { $set: { occupiedCount: 9 } },
      { returnDocument: 'after' }
    );
    const res = await request(app)
      .patch(`/api/v1/admin/time-slots/${slot._id}`)
      .set('Cookie', cookie)
      .send({ capacity: 10 });
    expect(res.status).toBe(200);
    expect(res.body.timeSlot).toMatchObject({
      capacity: 10,
      occupiedCount: 9,
      seatsLeft: 1,
      isFull: false
    });
  });

  it('keeps a slot full when capacity is lowered below the enrolled count (CAP-08)', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const slot = await TimeSlot.findOneAndUpdate(
      { dayOfWeek: 1, startTime: '17:00' },
      { $set: { occupiedCount: 9 } },
      { returnDocument: 'after' }
    );
    const res = await request(app)
      .patch(`/api/v1/admin/time-slots/${slot._id}`)
      .set('Cookie', cookie)
      .send({ capacity: 7 });
    expect(res.body.timeSlot).toMatchObject({ occupiedCount: 9, seatsLeft: 0, isFull: true });
  });

  it('validates the merged slot on update', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const slot = await TimeSlot.findOne({ dayOfWeek: 1, startTime: '17:00' });
    const res = await request(app)
      .patch(`/api/v1/admin/time-slots/${slot._id}`)
      .set('Cookie', cookie)
      .send({ endTime: '16:00' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.endTime).toBeTruthy();
  });

  it('refuses to delete a slot that courses still offer', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const slot = await TimeSlot.findOne({ dayOfWeek: 1, startTime: '17:00' });
    const res = await request(app)
      .delete(`/api/v1/admin/time-slots/${slot._id}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TIME_SLOT_IN_USE');
  });

  it('lets camp coordinators view but not edit (Phase 03 §6)', async () => {
    const { cookie } = await signInAs(app, 'camp_coordinator');
    expect((await request(app).get('/api/v1/admin/time-slots').set('Cookie', cookie)).status).toBe(
      200
    );
    const res = await request(app)
      .post('/api/v1/admin/time-slots')
      .set('Cookie', cookie)
      .send({ dayOfWeek: 7, startTime: '13:00', endTime: '14:00' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a malformed id', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const res = await request(app)
      .patch('/api/v1/admin/time-slots/not-an-id')
      .set('Cookie', cookie)
      .send({ capacity: 5 });
    expect(res.status).toBe(404);
  });
});

describe('admin: courses', () => {
  async function newCourseBody(overrides = {}) {
    const slot = await TimeSlot.findOne({ dayOfWeek: 2, startTime: '17:00' });
    const robotics = await FilterOption.findOne({ slug: 'robotics' });
    return {
      title: 'Robotics Club',
      code: 'str9001',
      slug: 'robotics-club',
      productType: 'regular_program',
      ageMin: 9,
      ageMax: 12,
      monthlyFee: 14999,
      timeSlots: [slot._id.toString()],
      filterOptions: [robotics._id.toString()],
      ...overrides
    };
  }

  it('creates a course and shows it on the public listing', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const res = await request(app)
      .post('/api/v1/admin/courses')
      .set('Cookie', cookie)
      .send(await newCourseBody());
    expect(res.status).toBe(201);
    expect(res.body.course.code).toBe('STR9001');

    const detail = await request(app).get('/api/v1/courses/robotics-club');
    expect(detail.body.course.timeSlots.map((slot) => slot.label)).toEqual([
      'Tuesday 5:00 – 6:00 PM'
    ]);
  });

  it('reports a duplicate code on the code field', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const res = await request(app)
      .post('/api/v1/admin/courses')
      .set('Cookie', cookie)
      .send(await newCourseBody({ code: 'STC2001' }));
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ code: ['Already in use'] });
  });

  it('rejects references to time slots that do not exist', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const res = await request(app)
      .post('/api/v1/admin/courses')
      .set('Cookie', cookie)
      .send(await newCourseBody({ timeSlots: ['0123456789abcdef01234567'] }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.timeSlots).toBeTruthy();
  });

  it('updates a course with a full replace', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const course = await Course.findOne({ code: 'STC2001' });
    const current = (
      await request(app).get(`/api/v1/admin/courses/${course._id}`).set('Cookie', cookie)
    ).body.course;
    const { id, updatedAt, ...body } = current; // eslint-disable-line no-unused-vars
    const res = await request(app)
      .put(`/api/v1/admin/courses/${course._id}`)
      .set('Cookie', cookie)
      .send({ ...body, monthlyFee: 13999, timeSlots: body.timeSlots.slice(0, 3) });
    expect(res.status).toBe(200);
    expect(res.body.course).toMatchObject({ monthlyFee: 13999 });
    expect(res.body.course.timeSlots).toHaveLength(3);
  });

  it('forbids content editors from editing courses and parents from the admin API', async () => {
    const editor = await signInAs(app, 'content_editor');
    const parent = await signInAs(app, 'parent');
    const body = await newCourseBody();
    expect(
      (await request(app).post('/api/v1/admin/courses').set('Cookie', editor.cookie).send(body))
        .status
    ).toBe(403);
    expect(
      (await request(app).get('/api/v1/admin/courses').set('Cookie', parent.cookie)).status
    ).toBe(403);
  });
});

describe('admin: filter groups and options (Brief §6)', () => {
  it('lets a content editor add a new group with options without a deploy (FIL-01)', async () => {
    const { cookie } = await signInAs(app, 'content_editor');
    const group = await request(app)
      .post('/api/v1/admin/filter-groups')
      .set('Cookie', cookie)
      .send({ name: 'Location' });
    expect(group.status).toBe(201);
    expect(group.body.group.slug).toBe('location');

    const option = await request(app)
      .post(`/api/v1/admin/filter-groups/${group.body.group.id}/options`)
      .set('Cookie', cookie)
      .send({ label: 'Cambridge' });
    expect(option.body.option.slug).toBe('cambridge');

    const publicGroups = (await request(app).get('/api/v1/filters')).body.groups;
    expect(publicGroups.at(-1)).toMatchObject({
      name: 'Location',
      options: [{ label: 'Cambridge' }]
    });
  });

  it('keeps the slug stable when a group is renamed', async () => {
    const { cookie } = await signInAs(app, 'content_editor');
    const groups = (await request(app).get('/api/v1/admin/filter-groups').set('Cookie', cookie))
      .body.groups;
    const ages = groups.find((group) => group.slug === 'age-level');
    await request(app)
      .patch(`/api/v1/admin/filter-groups/${ages.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Ages' });
    const after = (await request(app).get('/api/v1/filters')).body.groups.find(
      (group) => group.slug === 'age-level'
    );
    expect(after.name).toBe('Ages');
  });

  it('shows usage counts and removes an option from every course on delete (FIL-03)', async () => {
    const { cookie } = await signInAs(app, 'content_editor');
    const groups = (await request(app).get('/api/v1/admin/filter-groups').set('Cookie', cookie))
      .body.groups;
    const coding = groups
      .flatMap((group) => group.options)
      .find((option) => option.slug === 'coding');
    expect(coding.courseCount).toBe(3);

    const res = await request(app)
      .delete(`/api/v1/admin/filter-options/${coding.id}`)
      .set('Cookie', cookie);
    expect(res.body).toEqual({ coursesUpdated: 3 });
    expect(await Course.countDocuments({ filterOptions: coding.id })).toBe(0);
  });

  it('deletes a whole group with its options and course tags', async () => {
    const { cookie } = await signInAs(app, 'content_editor');
    const groups = (await request(app).get('/api/v1/admin/filter-groups').set('Cookie', cookie))
      .body.groups;
    const categories = groups.find((group) => group.slug === 'course-categories');
    const res = await request(app)
      .delete(`/api/v1/admin/filter-groups/${categories.id}`)
      .set('Cookie', cookie);
    expect(res.body).toEqual({ coursesUpdated: 11 });
    expect(await FilterOption.countDocuments({ group: categories.id })).toBe(0);
    expect(titles(await listCourses('?course-categories=robotics'))).toHaveLength(12); // group gone → ignored
  });

  it('hides inactive groups from the public sidebar and ignores them in filtering', async () => {
    const { cookie } = await signInAs(app, 'content_editor');
    const groups = (await request(app).get('/api/v1/admin/filter-groups').set('Cookie', cookie))
      .body.groups;
    const difficulty = groups.find((group) => group.slug === 'difficulty');
    await request(app)
      .patch(`/api/v1/admin/filter-groups/${difficulty.id}`)
      .set('Cookie', cookie)
      .send({ isActive: false });
    const publicSlugs = (await request(app).get('/api/v1/filters')).body.groups.map(
      (group) => group.slug
    );
    expect(publicSlugs).not.toContain('difficulty');
    expect(titles(await listCourses('?difficulty=basic'))).toHaveLength(12);
  });

  it('forbids camp coordinators from changing filters', async () => {
    const { cookie } = await signInAs(app, 'camp_coordinator');
    const res = await request(app)
      .post('/api/v1/admin/filter-groups')
      .set('Cookie', cookie)
      .send({ name: 'X' });
    expect(res.status).toBe(403);
  });
});
