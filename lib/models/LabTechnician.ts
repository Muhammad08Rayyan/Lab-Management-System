import mongoose, { Document, Schema } from 'mongoose';

export interface ILabTechnician extends Document {
  userId: mongoose.Types.ObjectId;
  techId: string;
  firstName: string;
  lastName: string;
  specialization: string[];
  phone: string;
  email: string;
  shift: 'morning' | 'evening' | 'night';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabTechnicianSchema = new Schema<ILabTechnician>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  techId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  specialization: [{
    type: String,
    trim: true
  }],
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  shift: {
    type: String,
    required: [true, 'Shift is required'],
    enum: ['morning', 'evening', 'night'],
    default: 'morning'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
LabTechnicianSchema.index({ techId: 1 });
LabTechnicianSchema.index({ userId: 1 });
LabTechnicianSchema.index({ email: 1 });
LabTechnicianSchema.index({ shift: 1 });

// Pre-save hook to generate techId
LabTechnicianSchema.pre('save', async function(next) {
  if (!this.techId) {
    const count = await mongoose.models.LabTechnician.countDocuments();
    this.techId = `TECH${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.models.LabTechnician || mongoose.model<ILabTechnician>('LabTechnician', LabTechnicianSchema);