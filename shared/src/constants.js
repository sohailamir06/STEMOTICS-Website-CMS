// Business constants shared by web, cms and server.
// Never put secrets or server-only logic in this package: it is bundled into the browser apps.

// All business dates (start dates, billing dates, camp dates) are calendar dates in this zone.
export const TIME_ZONE = 'America/Toronto';

// Brief §1: default capacity of a time slot, shared by every regular program in that slot.
export const DEFAULT_SLOT_CAPACITY = 9;

// Brief §5: cancel at least 4 weeks before the next billing date.
export const CANCELLATION_NOTICE_DAYS = 28;

// Business behaviour of a product. Display filters are separate, staff-managed data (Brief §6).
export const PRODUCT_TYPES = Object.freeze({
  REGULAR_PROGRAM: 'regular_program',
  CAMP: 'camp',
  ONE_TIME: 'one_time'
});

// Phase 03 §6. "instructor" is [Proposed] and has no access until its permissions are approved.
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  PROGRAM_MANAGER: 'program_manager',
  CAMP_COORDINATOR: 'camp_coordinator',
  CONTENT_EDITOR: 'content_editor',
  FINANCE_ADMIN: 'finance_admin',
  MARKETING_LEAD: 'marketing_lead',
  INSTRUCTOR: 'instructor',
  PARENT: 'parent'
});

export const STAFF_ROLES = Object.freeze(
  Object.values(ROLES).filter((role) => role !== ROLES.PARENT)
);

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.PROGRAM_MANAGER]: 'Program Manager',
  [ROLES.CAMP_COORDINATOR]: 'Camp Coordinator',
  [ROLES.CONTENT_EDITOR]: 'Content Editor',
  [ROLES.FINANCE_ADMIN]: 'Finance Admin',
  [ROLES.MARKETING_LEAD]: 'Marketing Lead',
  [ROLES.INSTRUCTOR]: 'Instructor',
  [ROLES.PARENT]: 'Parent'
});

export const LMS_URL = 'https://learn.stemotics.com/';
