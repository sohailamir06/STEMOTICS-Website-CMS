import { PRODUCT_TYPES, slugify } from '@stemotics/shared';
import { FilterGroup } from '../models/FilterGroup.js';
import { FilterOption } from '../models/FilterOption.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { Course } from '../models/Course.js';

// Starting catalog data. Every insert uses $setOnInsert, so re-running the seed never
// overwrites anything staff have changed in the CMS.

// Brief §6: current filter structure on stemotics.com.
const FILTER_GROUPS = [
  {
    name: 'Courses',
    options: [
      'AI, ML & Cyber Security',
      'City Programs',
      'Introductory',
      'Regular Programs',
      'Home School',
      'Camps'
    ]
  },
  { name: 'Age Level', options: ['Ages 4-5', 'Ages 6-8', 'Ages 9-12', 'Ages 13-15'] },
  { name: 'Course Categories', options: ['Robotics', 'Coding', 'Digital Design', 'Game Design'] },
  { name: 'Difficulty', options: ['Basic', 'Intermediate', 'Advanced'] },
  {
    name: 'School Workshop Categories',
    options: ['STEM Night at School', 'Bring your class to STEMOTICS']
  }
];

// Day & Time options on the live Coding Junior page (Phase 01 §3.2):
// Monday–Friday 5–8 PM and Saturday 10 AM–3 PM, in one-hour slots.
function liveSiteTimeSlots() {
  const hourly = (from, to) =>
    Array.from({ length: to - from }, (_, i) => [
      `${String(from + i).padStart(2, '0')}:00`,
      `${String(from + i + 1).padStart(2, '0')}:00`
    ]);
  const slots = [];
  for (let day = 1; day <= 5; day += 1) {
    for (const [startTime, endTime] of hourly(17, 20))
      slots.push({ dayOfWeek: day, startTime, endTime });
  }
  for (const [startTime, endTime] of hourly(10, 15))
    slots.push({ dayOfWeek: 6, startTime, endTime });
  return slots;
}

// The 12 regular programs on the live site (Phase 01 §3.2). Ages follow the Pre-Junior/Junior/
// Senior naming; only Coding Junior's price, levels and difficulty were verified on its product
// page. Verify the rest during content migration (Phase 11, Stage 7).
const AGE_BY_TIER = { 'Pre-Junior': [4, 5], 'Pre Junior': [4, 5], Junior: [6, 8], Senior: [9, 12] };
const REGULAR_PROGRAMS = [
  {
    title: 'Introduction to Artificial Intelligence',
    code: 'STAI4001',
    ages: [9, 12],
    tags: { Courses: ['AI, ML & Cyber Security'] }
  },
  { title: 'Coding Pre-Junior', code: 'STC1001', category: 'Coding' },
  {
    title: 'Coding Junior',
    code: 'STC2001',
    category: 'Coding',
    monthlyFee: 12999,
    tags: { Difficulty: ['Basic'] },
    levels: [
      { name: 'Level 1 – Express Coding Course', code: 'STC2001' },
      { name: 'Level 2 – CodeMonkey', code: 'STC2002' },
      { name: 'Level 3 – CodeCombat', code: 'STC2003' },
      { name: 'Level 4 – Scratch Coding, Animation & Game Design', code: 'STC2004' }
    ]
  },
  { title: 'Coding Senior', code: 'STC3001', category: 'Coding' },
  { title: 'Robotics Pre-Junior', code: 'STR1001', category: 'Robotics' },
  { title: 'Robotics Junior', code: 'STR2001', category: 'Robotics' },
  { title: 'Robotics Senior', code: 'STR3001', category: 'Robotics' },
  { title: 'Digital Design Pre Junior', code: 'STD1001', category: 'Digital Design' },
  { title: 'Digital Design Junior', code: 'STD2001', category: 'Digital Design' },
  { title: 'Digital Design Senior', code: 'STD3001', category: 'Digital Design' },
  { title: 'Game Design Junior', code: 'STG2001', category: 'Game Design' },
  { title: 'Game Design Senior', code: 'STG3001', category: 'Game Design' }
];

function agesFor(program) {
  if (program.ages) return program.ages;
  const tier = Object.keys(AGE_BY_TIER).find((name) => program.title.endsWith(name));
  return AGE_BY_TIER[tier];
}

function ageOptionFor([min, max]) {
  return `Ages ${min}-${max}`;
}

async function upsert(Model, filter, values) {
  const result = await Model.updateOne(filter, { $setOnInsert: values }, { upsert: true });
  return result.upsertedCount;
}

export async function seedCatalog() {
  const created = { filterGroups: 0, filterOptions: 0, timeSlots: 0, courses: 0 };

  // Filter groups and options; remember option ids by "Group/Option" for tagging courses.
  const optionIds = new Map();
  for (const [groupIndex, group] of FILTER_GROUPS.entries()) {
    const slug = slugify(group.name);
    created.filterGroups += await upsert(
      FilterGroup,
      { slug },
      { name: group.name, slug, sortOrder: groupIndex }
    );
    const groupDoc = await FilterGroup.findOne({ slug });
    for (const [optionIndex, label] of group.options.entries()) {
      const optionSlug = slugify(label);
      created.filterOptions += await upsert(
        FilterOption,
        { group: groupDoc._id, slug: optionSlug },
        { group: groupDoc._id, label, slug: optionSlug, sortOrder: optionIndex }
      );
      const option = await FilterOption.findOne({ group: groupDoc._id, slug: optionSlug });
      optionIds.set(`${group.name}/${label}`, option._id);
    }
  }

  for (const slot of liveSiteTimeSlots()) {
    created.timeSlots += await upsert(
      TimeSlot,
      { dayOfWeek: slot.dayOfWeek, startTime: slot.startTime },
      slot
    );
  }
  const slotIds = (await TimeSlot.find({}, '_id')).map((slot) => slot._id);

  for (const program of REGULAR_PROGRAMS) {
    const [ageMin, ageMax] = agesFor(program);
    const tags = {
      Courses: ['Regular Programs'],
      'Age Level': [ageOptionFor([ageMin, ageMax])],
      ...(program.category && { 'Course Categories': [program.category] })
    };
    for (const [group, labels] of Object.entries(program.tags ?? {})) {
      tags[group] = [...(tags[group] ?? []), ...labels];
    }
    const filterOptions = Object.entries(tags)
      .flatMap(([group, labels]) => labels.map((label) => optionIds.get(`${group}/${label}`)))
      .filter(Boolean);

    created.courses += await upsert(
      Course,
      { code: program.code },
      {
        title: program.title,
        code: program.code,
        slug: slugify(program.title),
        productType: PRODUCT_TYPES.REGULAR_PROGRAM,
        ageMin,
        ageMax,
        levels: program.levels ?? [],
        monthlyFee: program.monthlyFee ?? null,
        timeSlots: slotIds,
        filterOptions,
        isActive: true
      }
    );
  }

  return created;
}
