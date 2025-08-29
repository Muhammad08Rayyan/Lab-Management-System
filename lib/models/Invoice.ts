import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  invoiceNumber: string;
  testOrder: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  issueDate: Date;
  dueDate: Date;
  items: {
    type: 'test' | 'package';
    item: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discount: number;
  discountPercentage: number;
  tax: number;
  taxPercentage: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  paymentMethod?: 'cash' | 'card' | 'online' | 'bank_transfer';
  paymentReference?: string;
  notes?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  testOrder: {
    type: Schema.Types.ObjectId,
    ref: 'TestOrder',
    required: [true, 'Test order is required']
  },
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  items: [{
    type: {
      type: String,
      required: true,
      enum: ['test', 'package']
    },
    item: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'items.type'
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Price cannot be negative']
    }
  }],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  taxPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Tax percentage cannot be negative'],
    max: [100, 'Tax percentage cannot exceed 100']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  balanceAmount: {
    type: Number,
    required: [true, 'Balance amount is required'],
    min: [0, 'Balance amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'bank_transfer']
  },
  paymentReference: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true
});

// Indexes for faster queries (invoiceNumber already has unique index)
InvoiceSchema.index({ testOrder: 1 });
InvoiceSchema.index({ patient: 1 });
InvoiceSchema.index({ paymentStatus: 1 });
InvoiceSchema.index({ issueDate: -1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ isActive: 1 });

// Compound indexes
InvoiceSchema.index({ patient: 1, issueDate: -1 });
InvoiceSchema.index({ paymentStatus: 1, dueDate: 1 });

// Pre-save hook to generate invoice number and calculate amounts
InvoiceSchema.pre('save', async function(next) {
  // Generate invoice number
  if (!this.invoiceNumber) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.models.Invoice.countDocuments({
      createdAt: {
        $gte: new Date(year, today.getMonth(), 1),
        $lt: new Date(year, today.getMonth() + 1, 1)
      }
    });
    this.invoiceNumber = `INV${year}${month}${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate subtotal from items
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);

  // Calculate discount amount from percentage if not set
  if (this.discountPercentage > 0 && this.discount === 0) {
    this.discount = (this.subtotal * this.discountPercentage) / 100;
  }

  // Calculate tax amount from percentage if not set
  const discountedAmount = this.subtotal - this.discount;
  if (this.taxPercentage > 0 && this.tax === 0) {
    this.tax = (discountedAmount * this.taxPercentage) / 100;
  }

  // Calculate total amount
  this.totalAmount = discountedAmount + this.tax;

  // Calculate balance amount
  this.balanceAmount = this.totalAmount - this.paidAmount;

  // Update payment status based on amounts
  if (this.paidAmount === 0) {
    this.paymentStatus = this.dueDate < new Date() ? 'overdue' : 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
    this.balanceAmount = 0;
  } else {
    this.paymentStatus = 'partial';
  }

  // Set due date to 30 days from issue date if not provided
  if (!this.dueDate) {
    this.dueDate = new Date(this.issueDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  }

  next();
});

const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;