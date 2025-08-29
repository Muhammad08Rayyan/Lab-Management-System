import mongoose, { Document, Schema } from 'mongoose';

export interface ITestCategory extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestCategorySchema = new Schema<ITestCategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries (name index is already created by unique: true)
TestCategorySchema.index({ isActive: 1 });

export default mongoose.models.TestCategory || mongoose.model<ITestCategory>('TestCategory', TestCategorySchema);