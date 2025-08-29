import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctor extends Document {
  userId: mongoose.Types.ObjectId;
  doctorId: string;
  firstName: string;
  lastName: string;
  specialization: string;
  phone: string;
  email: string;
  clinic?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
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
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
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
  clinic: {
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

// Indexes for faster queries (doctorId already has unique index)
DoctorSchema.index({ userId: 1 });
DoctorSchema.index({ email: 1 });
DoctorSchema.index({ specialization: 1 });

// Pre-save hook to generate doctorId
DoctorSchema.pre('save', async function(next) {
  if (!this.doctorId) {
    const count = await mongoose.models.Doctor.countDocuments();
    this.doctorId = `DOC${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Doctor = mongoose.models.Doctor || mongoose.model<IDoctor>("Doctor", DoctorSchema);
export default Doctor;