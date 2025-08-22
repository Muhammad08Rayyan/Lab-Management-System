import mongoose, { Document, Schema } from 'mongoose';

export interface ITestPackage extends Document {
  packageCode: string;
  packageName: string;
  tests: mongoose.Types.ObjectId[];
  originalPrice: number;
  packagePrice: number;
  discount: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestPackageSchema = new Schema<ITestPackage>({
  packageCode: {
    type: String,
    required: [true, 'Package code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  packageName: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true
  },
  tests: [{
    type: Schema.Types.ObjectId,
    ref: 'LabTest',
    required: true
  }],
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Price cannot be negative']
  },
  packagePrice: {
    type: Number,
    required: [true, 'Package price is required'],
    min: [0, 'Price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
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

// Indexes for faster queries
TestPackageSchema.index({ packageCode: 1 });
TestPackageSchema.index({ packageName: 1 });
TestPackageSchema.index({ isActive: 1 });
TestPackageSchema.index({ packagePrice: 1 });

// Pre-save hook to calculate discount
TestPackageSchema.pre('save', function(next) {
  if (this.originalPrice && this.packagePrice) {
    this.discount = Math.round(((this.originalPrice - this.packagePrice) / this.originalPrice) * 100);
  }
  next();
});

export default mongoose.models.TestPackage || mongoose.model<ITestPackage>('TestPackage', TestPackageSchema);