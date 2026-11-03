import { slugify } from '@stemotics/shared';
import { FilterGroup } from '../models/FilterGroup.js';
import { FilterOption } from '../models/FilterOption.js';
import { Course } from '../models/Course.js';
import { notFoundError } from '../utils/errors.js';

async function uniqueSlug(text, isTaken) {
  const base = slugify(text) || 'item';
  let slug = base;
  for (let n = 2; await isTaken(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

async function courseCountsByOption() {
  const rows = await Course.aggregate([
    { $unwind: '$filterOptions' },
    { $group: { _id: '$filterOptions', count: { $sum: 1 } } }
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

// Public: active groups only. Admin: all groups, with how many courses use each option
// (shown before a delete so staff know what they are changing).
export async function listFilterGroups({ admin = false } = {}) {
  const groups = await FilterGroup.find(admin ? {} : { isActive: true }).sort({
    sortOrder: 1,
    name: 1
  });
  const [options, counts] = await Promise.all([
    FilterOption.find({ group: { $in: groups.map((group) => group._id) } }).sort({
      sortOrder: 1,
      label: 1
    }),
    admin ? courseCountsByOption() : new Map()
  ]);

  return groups.map((group) => ({
    id: group._id.toString(),
    name: group.name,
    slug: group.slug,
    sortOrder: group.sortOrder,
    ...(admin && { isActive: group.isActive }),
    options: options
      .filter((option) => option.group.equals(group._id))
      .map((option) => ({
        id: option._id.toString(),
        label: option.label,
        slug: option.slug,
        sortOrder: option.sortOrder,
        ...(admin && { courseCount: counts.get(option._id.toString()) ?? 0 })
      }))
  }));
}

// New groups/options go to the end of the list unless a position is given.
async function nextSortOrder(Model, filter = {}) {
  const last = await Model.findOne(filter).sort({ sortOrder: -1 }).select('sortOrder');
  return last ? last.sortOrder + 1 : 0;
}

export async function createFilterGroup({ name, sortOrder, isActive = true }) {
  sortOrder ??= await nextSortOrder(FilterGroup);
  const slug = await uniqueSlug(name, (candidate) => FilterGroup.exists({ slug: candidate }));
  const group = await FilterGroup.create({ name, slug, sortOrder, isActive });
  return { id: group._id.toString(), name, slug, sortOrder, isActive, options: [] };
}

// The slug stays the same when the name changes, so shared filter links keep working.
export async function updateFilterGroup(id, changes) {
  const group = await FilterGroup.findByIdAndUpdate(
    id,
    { $set: changes },
    { returnDocument: 'after' }
  );
  if (!group) throw notFoundError('Filter group not found.');
}

// Removes the group, its options, and their tags on every course.
// No transaction (works on a standalone MongoDB): the group and options are deleted first, so
// the public site stops showing them at once; if the untagging step were interrupted, stale
// tags point at deleted options, which the listing already ignores, and re-running is safe.
export async function deleteFilterGroup(id) {
  const group = await FilterGroup.findById(id);
  if (!group) throw notFoundError('Filter group not found.');
  const optionIds = (await FilterOption.find({ group: id }, '_id')).map((option) => option._id);
  await FilterGroup.deleteOne({ _id: id });
  await FilterOption.deleteMany({ group: id });
  const untagged = await Course.updateMany(
    { filterOptions: { $in: optionIds } },
    { $pull: { filterOptions: { $in: optionIds } } }
  );
  return { coursesUpdated: untagged.modifiedCount };
}

export async function createFilterOption(groupId, { label, sortOrder }) {
  if (!(await FilterGroup.exists({ _id: groupId }))) throw notFoundError('Filter group not found.');
  sortOrder ??= await nextSortOrder(FilterOption, { group: groupId });
  const slug = await uniqueSlug(label, (candidate) =>
    FilterOption.exists({ group: groupId, slug: candidate })
  );
  const option = await FilterOption.create({ group: groupId, label, slug, sortOrder });
  return { id: option._id.toString(), label, slug, sortOrder, courseCount: 0 };
}

export async function updateFilterOption(id, changes) {
  const option = await FilterOption.findByIdAndUpdate(
    id,
    { $set: changes },
    { returnDocument: 'after' }
  );
  if (!option) throw notFoundError('Filter option not found.');
}

export async function deleteFilterOption(id) {
  const deleted = await FilterOption.deleteOne({ _id: id });
  if (deleted.deletedCount === 0) throw notFoundError('Filter option not found.');
  const untagged = await Course.updateMany({ filterOptions: id }, { $pull: { filterOptions: id } });
  return { coursesUpdated: untagged.modifiedCount };
}

// Turns listing query params into course filter clauses (Brief §6, Phase 04 §4.3):
//   ?course-categories=robotics&course-categories=coding&age-level=ages-6-8
// → (Robotics OR Coding) AND (Ages 6-8). Unknown groups/options are ignored.
export async function resolveFilterSelection(query) {
  const requested = new Map();
  for (const [groupSlug, raw] of Object.entries(query ?? {})) {
    const values = [raw]
      .flat()
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length) requested.set(groupSlug, values);
  }
  if (requested.size === 0) return { clauses: [], selected: {} };

  const groups = await FilterGroup.find({ slug: { $in: [...requested.keys()] }, isActive: true });
  const clauses = [];
  const selected = {};

  for (const group of groups) {
    const options = await FilterOption.find({
      group: group._id,
      slug: { $in: requested.get(group.slug) }
    });
    if (options.length === 0) continue;
    clauses.push({ filterOptions: { $in: options.map((option) => option._id) } });
    const requestedOrder = requested.get(group.slug);
    selected[group.slug] = options
      .map((option) => option.slug)
      .sort((a, b) => requestedOrder.indexOf(a) - requestedOrder.indexOf(b));
  }

  return { clauses, selected };
}
