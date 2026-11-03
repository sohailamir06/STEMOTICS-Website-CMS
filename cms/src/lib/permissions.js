import { PERMISSIONS, ROLES } from '@stemotics/shared';

const { SUPER_ADMIN, PROGRAM_MANAGER, CAMP_COORDINATOR, CONTENT_EDITOR, MARKETING_LEAD } = ROLES;

// Admin modules (Phase 03 §2) with the roles that see them (Phase 03 §6) and the build stage
// that delivers them (Phase 11 §2); `ready` marks modules already built. Hiding menu items is convenience only: the API enforces
// every permission. The [Proposed] Instructor role sees nothing until its access is approved.
export const MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    stage: 0,
    ready: true,
    roles: PERMISSIONS['dashboard.view']
  },
  {
    key: 'programs',
    label: 'Programs & Camps',
    path: '/programs',
    stage: 1,
    brief: '§1, §3',
    ready: true,
    roles: PERMISSIONS['programs.view']
  },
  {
    key: 'filters',
    label: 'Course Filters',
    path: '/filters',
    stage: 1,
    brief: '§6',
    ready: true,
    roles: PERMISSIONS['filters.view']
  },
  {
    key: 'payments',
    label: 'Payments & Customers',
    path: '/payments',
    stage: 2,
    brief: '§5, §10',
    ready: true,
    roles: PERMISSIONS['payments.view']
  },
  {
    key: 'enrollment',
    label: 'Enrollment & Attendance',
    path: '/enrollment',
    stage: 3,
    brief: '§1–§3',
    roles: [SUPER_ADMIN, PROGRAM_MANAGER, CAMP_COORDINATOR]
  },
  {
    key: 'medical',
    label: 'Medical Forms',
    path: '/medical',
    stage: 4,
    brief: '§4',
    roles: [SUPER_ADMIN, PROGRAM_MANAGER, CAMP_COORDINATOR]
  },
  {
    key: 'forms',
    label: 'Form Builder',
    path: '/forms',
    stage: 4,
    brief: '§11',
    roles: [SUPER_ADMIN, PROGRAM_MANAGER, CAMP_COORDINATOR]
  },
  {
    key: 'content',
    label: 'Website Content',
    path: '/content',
    stage: 5,
    brief: '§7–§9',
    roles: [SUPER_ADMIN, PROGRAM_MANAGER, CONTENT_EDITOR]
  },
  {
    key: 'marketing',
    label: 'Email, Newsletter & SMS',
    path: '/marketing',
    stage: 6,
    brief: '§3, §7, §10',
    roles: [SUPER_ADMIN, PROGRAM_MANAGER, CAMP_COORDINATOR, CONTENT_EDITOR, MARKETING_LEAD]
  },
  {
    key: 'settings',
    label: 'Staff & Settings',
    path: '/settings',
    stage: 1,
    ready: true,
    roles: PERMISSIONS['staff.manage']
  }
];

export function modulesFor(role) {
  return MODULES.filter((module) => module.roles.includes(role));
}

export function canAccess(role, moduleKey) {
  return MODULES.some((module) => module.key === moduleKey && module.roles.includes(role));
}
