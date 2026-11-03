import mongoose from 'mongoose';
import { PRODUCT_TYPES } from '@stemotics/shared';

const { ObjectId } = mongoose.Schema.Types;

const levelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Level 1 – Express Coding Course"
    code: { type: String, required: true } // "STC2001"
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    // Business behaviour (fixed list). Display filters are separate, staff-managed data.
    productType: { type: String, required: true, enum: Object.values(PRODUCT_TYPES) },
    summary: { type: String, default: '' },
    description: { type: String, default: '' },
    ageMin: { type: Number, default: null },
    ageMax: { type: Number, default: null },
    levels: { type: [levelSchema], default: [] },
    monthlyFee: { type: Number, default: null }, // cents, regular programs
    oneTimeFee: { type: Number, default: null }, // cents, one-time products
    timeSlots: [{ type: ObjectId, ref: 'TimeSlot' }], // shared slots this course is offered in
    filterOptions: [{ type: ObjectId, ref: 'FilterOption', index: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Course = mongoose.model('Course', courseSchema);
