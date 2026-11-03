import mongoose from 'mongoose';

// A parent's child. Medical/emergency details are added in Stage 4 (MedicalForm, encrypted).
const childSchema = new mongoose.Schema(
  {
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

childSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export const Child = mongoose.model('Child', childSchema);
