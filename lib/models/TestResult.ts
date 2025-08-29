import mongoose, { Document, Schema } from 'mongoose';

export interface ITestResult extends Document {
  testOrder: mongoose.Types.ObjectId;
  test: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  technician: mongoose.Types.ObjectId;
  resultData: {
    parameter: string;
    value: string;
    unit?: string;
    normalRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }[];
  overallStatus: 'normal' | 'abnormal' | 'critical';
  comments?: string;
  reportedDate: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedDate?: Date;
  isVerified: boolean;
  reportUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestResultSchema = new Schema<ITestResult>({
  testOrder: {
    type: Schema.Types.ObjectId,
    ref: 'TestOrder',
    required: [true, 'Test order is required']
  },
  test: {
    type: Schema.Types.ObjectId,
    ref: 'LabTest',
    required: [true, 'Test is required']
  },
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  technician: {
    type: Schema.Types.ObjectId,
    ref: 'LabTechnician',
    required: [true, 'Technician is required']
  },
  resultData: [{
    parameter: {
      type: String,
      required: [true, 'Parameter name is required'],
      trim: true
    },
    value: {
      type: String,
      required: [true, 'Parameter value is required'],
      trim: true
    },
    unit: {
      type: String,
      trim: true
    },
    normalRange: {
      type: String,
      trim: true
    },
    flag: {
      type: String,
      enum: ['normal', 'high', 'low', 'critical'],
      default: 'normal'
    }
  }],
  overallStatus: {
    type: String,
    required: true,
    enum: ['normal', 'abnormal', 'critical'],
    default: 'normal'
  },
  comments: {
    type: String,
    trim: true
  },
  reportedDate: {
    type: Date,
    required: [true, 'Reported date is required'],
    default: Date.now
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  verifiedDate: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  reportUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
TestResultSchema.index({ testOrder: 1 });
TestResultSchema.index({ test: 1 });
TestResultSchema.index({ patient: 1 });
TestResultSchema.index({ technician: 1 });
TestResultSchema.index({ overallStatus: 1 });
TestResultSchema.index({ isVerified: 1 });
TestResultSchema.index({ reportedDate: -1 });

// Compound indexes
TestResultSchema.index({ patient: 1, reportedDate: -1 });
TestResultSchema.index({ testOrder: 1, test: 1 });

const TestResult = mongoose.models.TestResult || mongoose.model<ITestResult>("TestResult", TestResultSchema);
export default TestResult;