import mongoose from 'mongoose';
import { ROLES, STAFF_ROLES } from '@stemotics/shared';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Null for guest-checkout parents until they set a password through the emailed link.
    passwordHash: { type: String, default: null, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, default: null }, // E.164, e.g. +15199571073
    role: { type: String, required: true, enum: Object.values(ROLES), default: ROLES.PARENT },
    isActive: { type: Boolean, default: true },
    // Account lockout after repeated failed logins (Phase 08 §2.1).
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

userSchema.virtual('isStaff').get(function () {
  return STAFF_ROLES.includes(this.role);
});

// The only shape of a user that leaves the API.
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    role: this.role,
    phone: this.phone ?? null
  };
};

export const User = mongoose.model('User', userSchema);
