import { ROLES, STAFF_ROLES } from '@stemotics/shared';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { badRequest, notFoundError } from '../utils/errors.js';
import { hashPassword } from './authService.js';

function serializeStaff(user) {
  return {
    ...user.toPublicJSON(),
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt
  };
}

async function revokeAllSessions(userId, reason) {
  await Session.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}

export async function listStaff() {
  const users = await User.find({ role: { $in: STAFF_ROLES } }).sort({ lastName: 1, firstName: 1 });
  return users.map(serializeStaff);
}

export async function createStaff({ email, firstName, lastName, role, password }) {
  const user = await User.create({
    email,
    firstName,
    lastName,
    role,
    passwordHash: await hashPassword(password)
  });
  return serializeStaff(user);
}

export async function updateStaff(actorId, id, changes) {
  const user = await User.findOne({ _id: id, role: { $in: STAFF_ROLES } });
  if (!user) throw notFoundError('Staff member not found.');

  const losesSuperAdmin =
    user.role === ROLES.SUPER_ADMIN &&
    ((changes.role && changes.role !== ROLES.SUPER_ADMIN) || changes.isActive === false);

  if (losesSuperAdmin && user._id.equals(actorId)) {
    throw badRequest(
      'CANNOT_CHANGE_OWN_ACCESS',
      'You cannot remove your own Super Admin access. Ask another Super Admin.'
    );
  }
  if (losesSuperAdmin) {
    const otherSuperAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: ROLES.SUPER_ADMIN,
      isActive: true
    });
    if (otherSuperAdmins === 0) {
      throw badRequest('LAST_SUPER_ADMIN', 'There must always be at least one active Super Admin.');
    }
  }

  const { password, ...fields } = changes;
  user.set(fields);
  if (password) user.passwordHash = await hashPassword(password);
  await user.save();

  // Deactivation, a new password or a new role ends existing sessions, so the change applies
  // at the next request after the current 15-minute access token expires.
  if (changes.isActive === false || password || changes.role) {
    await revokeAllSessions(user._id, 'staff_account_changed');
  }
  return serializeStaff(user);
}
