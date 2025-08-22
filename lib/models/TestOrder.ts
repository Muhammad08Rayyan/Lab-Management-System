import mongoose, { Document, Schema } from 'mongoose';

export interface ITestOrder extends Document {
  orderNumber: string;
  patient: mongoose.Types.ObjectId;
  doctor?: mongoose.Types.ObjectId;
  tests: mongoose.Types.ObjectId[];
  packages: mongoose.Types.ObjectId[];
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMethod: 'cash' | 'card' | 'online';
  orderStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'stat';
  sampleCollectionDate?: Date;
  expectedReportDate?: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestOrderSchema = new Schema<ITestOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  tests: [{
    type: Schema.Types.ObjectId,
    ref: 'LabTest'
  }],
  packages: [{
    type: Schema.Types.ObjectId,
    ref: 'TestPackage'
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online'],
    default: 'cash'
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    required: true,
    enum: ['normal', 'urgent', 'stat'],
    default: 'normal'
  },
  sampleCollectionDate: {
    type: Date
  },
  expectedReportDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
TestOrderSchema.index({ orderNumber: 1 });
TestOrderSchema.index({ patient: 1 });
TestOrderSchema.index({ doctor: 1 });
TestOrderSchema.index({ orderStatus: 1 });
TestOrderSchema.index({ paymentStatus: 1 });
TestOrderSchema.index({ priority: 1 });
TestOrderSchema.index({ createdAt: -1 });

// Pre-save hook to generate order number
TestOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.models.TestOrder.countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });
    this.orderNumber = `ORD${dateStr}${String(count + 1).padStart(4, '0')}`;
  }
  
  // Update payment status based on paid amount
  if (this.paidAmount === 0) {
    this.paymentStatus = 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }
  
  next();
});

export default mongoose.models.TestOrder || mongoose.model<ITestOrder>('TestOrder', TestOrderSchema);