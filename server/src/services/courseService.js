import { compareSlots } from '@stemotics/shared';
import { Course } from '../models/Course.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { FilterOption } from '../models/FilterOption.js';
import { badRequest, notFoundError } from '../utils/errors.js';
import { resolveFilterSelection } from './filterService.js';
import { serializeTimeSlot } from './timeSlotService.js';

const TAGS_POPULATE = {
  path: 'filterOptions',
  select: 'label slug group',
  populate: { path: 'group', select: 'name slug isActive' }
};

// Tags from active filter groups, e.g. { group: 'age-level', label: 'Ages 6-8', slug: 'ages-6-8' }.
function serializeTags(course) {
  return course.filterOptions
    .filter((option) => option?.group?.isActive)
    .map((option) => ({
      group: option.group.slug,
      groupName: option.group.name,
      slug: option.slug,
      label: option.label
    }));
}

function serializeSummary(course) {
  return {
    title: course.title,
    code: course.code,
    slug: course.slug,
    productType: course.productType,
    summary: course.summary,
    ageMin: course.ageMin,
    ageMax: course.ageMax,
    monthlyFee: course.monthlyFee,
    oneTimeFee: course.oneTimeFee,
    tags: serializeTags(course)
  };
}

// ---- Public ---------------------------------------------------------------

export async function listPublicCourses(query) {
  const { clauses, selected } = await resolveFilterSelection(query);
  const filter = { isActive: true, ...(clauses.length > 0 && { $and: clauses }) };
  const courses = await Course.find(filter).sort({ title: 1 }).populate(TAGS_POPULATE);
  return { courses: courses.map(serializeSummary), selected };
}

export async function getPublicCourse(slug) {
  const course = await Course.findOne({ slug, isActive: true })
    .populate(TAGS_POPULATE)
    .populate('timeSlots');
  if (!course) throw notFoundError('Course not found.');

  return {
    ...serializeSummary(course),
    description: course.description,
    levels: course.levels.map(({ name, code }) => ({ name, code })),
    timeSlots: course.timeSlots
      .filter((slot) => slot?.isActive)
      .sort(compareSlots)
      .map((slot) => serializeTimeSlot(slot))
  };
}

// ---- Admin ----------------------------------------------------------------

function serializeAdmin(course) {
  return {
    id: course._id.toString(),
    title: course.title,
    code: course.code,
    slug: course.slug,
    productType: course.productType,
    summary: course.summary,
    description: course.description,
    ageMin: course.ageMin,
    ageMax: course.ageMax,
    levels: course.levels.map(({ name, code }) => ({ name, code })),
    monthlyFee: course.monthlyFee,
    oneTimeFee: course.oneTimeFee,
    timeSlots: course.timeSlots.map(String),
    filterOptions: course.filterOptions.map(String),
    isActive: course.isActive,
    updatedAt: course.updatedAt
  };
}

// Every referenced slot/option must exist, so a stale CMS form cannot save broken links.
async function assertReferencesExist({ timeSlots, filterOptions }) {
  const details = {};
  const slotIds = [...new Set(timeSlots)];
  const optionIds = [...new Set(filterOptions)];
  if ((await TimeSlot.countDocuments({ _id: { $in: slotIds } })) !== slotIds.length) {
    details.timeSlots = ['One or more time slots no longer exist. Reload and try again.'];
  }
  if ((await FilterOption.countDocuments({ _id: { $in: optionIds } })) !== optionIds.length) {
    details.filterOptions = ['One or more filter options no longer exist. Reload and try again.'];
  }
  if (Object.keys(details).length > 0) {
    throw badRequest('VALIDATION_ERROR', 'Please check the highlighted fields.', details);
  }
  return { timeSlots: slotIds, filterOptions: optionIds };
}

export async function listAdminCourses() {
  const courses = await Course.find().sort({ title: 1 });
  return courses.map(serializeAdmin);
}

export async function getAdminCourse(id) {
  const course = await Course.findById(id);
  if (!course) throw notFoundError('Course not found.');
  return serializeAdmin(course);
}

export async function createCourse(input) {
  const references = await assertReferencesExist(input);
  const course = await Course.create({ ...input, ...references });
  return serializeAdmin(course);
}

// Full replace: the CMS form always sends the whole course.
// Stage 2: block removing a time slot that still has enrolled children for this course.
export async function updateCourse(id, input) {
  const references = await assertReferencesExist(input);
  const course = await Course.findById(id);
  if (!course) throw notFoundError('Course not found.');
  course.set({ ...input, ...references });
  await course.save();
  return serializeAdmin(course);
}
