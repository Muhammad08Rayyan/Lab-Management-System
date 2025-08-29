import mongoose, { Document, Schema } from 'mongoose';

export interface IPatient extends Document {
  userId: mongoose.Types.ObjectId;
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  medicalHistory: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
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
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Pakistan' }
  },
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true }
  },
  medicalHistory: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for faster queries (patientId index is already created by unique: true)
PatientSchema.index({ userId: 1 });
PatientSchema.index({ email: 1 });
PatientSchema.index({ phone: 1 });

// Pre-validate hook to generate patientId BEFORE validation
PatientSchema.pre('validate', async function(next) {
  console.log('Patient pre-validate hook running for:', this.firstName, this.lastName);
  if (!this.patientId) {
    try {
      const PatientModel = this.constructor as mongoose.Model<IPatient>;
      const count = await PatientModel.countDocuments();
      this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
      console.log('Generated patientId:', this.patientId);
    } catch (error) {
      console.error('Error generating patientId:', error);
      // Fallback to timestamp-based ID
      this.patientId = `PAT${Date.now().toString().slice(-6)}`;
      console.log('Using fallback patientId:', this.patientId);
    }
  }
  console.log('Patient pre-validate hook completed');
  next();
});

const Patient = mongoose.models.Patient || mongoose.model<IPatient>("Patient", PatientSchema);
export default Patient;