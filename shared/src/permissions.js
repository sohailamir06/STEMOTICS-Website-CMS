import { ROLES } from './constants.js';

const {
  SUPER_ADMIN,
  PROGRAM_MANAGER,
  CAMP_COORDINATOR,
  CONTENT_EDITOR,
  FINANCE_ADMIN,
  MARKETING_LEAD
} = ROLES;

// Who may do what (Phase 03 §6). The API enforces these; the CMS uses the same table to
// hide buttons and menu items. Add permissions here as each stage adds modules.
export const PERMISSIONS = Object.freeze({
  'programs.view': [SUPER_ADMIN, PROGRAM_MANAGER, CAMP_COORDINATOR, CONTENT_EDITOR],
  'programs.edit': [SUPER_ADMIN, PROGRAM_MANAGER],
  'filters.view': [SUPER_ADMIN, PROGRAM_MANAGER, CONTENT_EDITOR],
  'filters.edit': [SUPER_ADMIN, PROGRAM_MANAGER, CONTENT_EDITOR],
  'staff.manage': [SUPER_ADMIN],
  // Phase 03 §6: Program Managers can view orders; Finance Admins manage billing.
  'payments.view': [SUPER_ADMIN, PROGRAM_MANAGER, FINANCE_ADMIN],
  'payments.manage': [SUPER_ADMIN, FINANCE_ADMIN],
  'dashboard.view': [
    SUPER_ADMIN,
    PROGRAM_MANAGER,
    CAMP_COORDINATOR,
    CONTENT_EDITOR,
    FINANCE_ADMIN,
    MARKETING_LEAD
  ]
});

export function can(role, permission) {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}
