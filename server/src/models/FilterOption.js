import mongoose from 'mongoose';

const filterOptionSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FilterGroup',
      required: true,
      index: true
    },
    label: { type: String, required: true, trim: true },
    // Set from the label when created and kept stable afterwards, so shared links keep working.
    slug: { type: String, required: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

filterOptionSchema.index({ group: 1, slug: 1 }, { unique: true });

export const FilterOption = mongoose.model('FilterOption', filterOptionSchema);
