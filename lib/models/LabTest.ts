import mongoose, { Document, Schema } from 'mongoose';

export interface ILabTest extends Document {
  testCode: string;
  testName: string;
  category: mongoose.Types.ObjectId;
  description?: string;
  price: number;
  normalRange?: string;
  sampleType: string;
  reportingTime: string;
  instructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabTestSchema = new Schema<ILabTest>({
  testCode: {
    type: String,
    required: [true, 'Test code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  testName: {
    type: String,
    required: [true, 'Test name is required'],
    trim: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'TestCategory',
    required: [true, 'Test category is required']
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Test price is required'],
    min: [0, 'Price cannot be negative']
  },
  normalRange: {
    type: String,
    trim: true
  },
  sampleType: {
    type: String,
    required: [true, 'Sample type is required'],
    trim: true
  },
  reportingTime: {
    type: String,
    required: [true, 'Reporting time is required'],
    trim: true
  },
  instructions: {
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

// Indexes for faster queries
LabTestSchema.index({ testCode: 1 });
LabTestSchema.index({ testName: 1 });
LabTestSchema.index({ category: 1 });
LabTestSchema.index({ isActive: 1 });
LabTestSchema.index({ price: 1 });

export default mongoose.models.LabTest || mongoose.model<ILabTest>('LabTest', LabTestSchema);