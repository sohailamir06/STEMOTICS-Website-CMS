import mongoose from 'mongoose';

// Brief §6: staff add/remove filter groups (e.g. "Age Level") without a developer.
const filterGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true }, // used in course listing URLs
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const FilterGroup = mongoose.model('FilterGroup', filterGroupSchema);
