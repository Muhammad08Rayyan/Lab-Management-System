import { z } from 'zod';

// Common validations
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits');

// Patient validations
export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  gender: z.enum(['male', 'female', 'other']),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional()
  }).optional(),
  medicalHistory: z.array(z.object({
    condition: z.string(),
    diagnosedDate: z.string().optional(),
    notes: z.string().optional()
  })).optional()
});

export const updatePatientSchema = createPatientSchema.partial();

// Test validations
export const createTestSchema = z.object({
  testCode: z.string().min(1, 'Test code is required').max(20, 'Test code too long'),
  testName: z.string().min(1, 'Test name is required').max(100, 'Test name too long'),
  category: objectIdSchema,
  description: z.string().max(500, 'Description too long').optional(),
  price: z.number().min(0, 'Price cannot be negative'),
  normalRange: z.string().max(100, 'Normal range too long').optional(),
  sampleType: z.string().min(1, 'Sample type is required').max(50, 'Sample type too long'),
  reportingTime: z.string().min(1, 'Reporting time is required').max(50, 'Reporting time too long'),
  instructions: z.string().max(1000, 'Instructions too long').optional()
});

export const updateTestSchema = createTestSchema.partial().extend({
  isActive: z.boolean().optional()
});

// Test Order validations
export const createTestOrderSchema = z.object({
  patient: objectIdSchema,
  doctor: objectIdSchema.optional(),
  tests: z.array(objectIdSchema).optional(),
  packages: z.array(objectIdSchema).optional(),
  priority: z.enum(['normal', 'urgent', 'stat']).default('normal'),
  sampleCollectionDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
  expectedReportDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  paymentMethod: z.enum(['cash', 'card', 'online']).default('cash')
}).refine(data => (data.tests && data.tests.length > 0) || (data.packages && data.packages.length > 0), {
  message: 'At least one test or package must be selected'
});

export const updateTestOrderSchema = z.object({
  orderStatus: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['normal', 'urgent', 'stat']).optional(),
  sampleCollectionDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
  expectedReportDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional(),
  paymentMethod: z.enum(['cash', 'card', 'online']).optional()
});

// Test Result validations
export const resultDataSchema = z.object({
  parameter: z.string().min(1, 'Parameter name is required'),
  value: z.string().min(1, 'Parameter value is required'),
  unit: z.string().optional(),
  normalRange: z.string().optional(),
  flag: z.enum(['normal', 'high', 'low', 'critical']).default('normal')
});

export const createTestResultSchema = z.object({
  testOrder: objectIdSchema,
  test: objectIdSchema,
  patient: objectIdSchema,
  resultData: z.array(resultDataSchema).min(1, 'At least one result parameter is required'),
  overallStatus: z.enum(['normal', 'abnormal', 'critical']).default('normal'),
  comments: z.string().max(1000, 'Comments too long').optional(),
  reportUrl: z.string().url('Invalid URL format').optional()
});

export const updateTestResultSchema = z.object({
  resultData: z.array(resultDataSchema).optional(),
  overallStatus: z.enum(['normal', 'abnormal', 'critical']).optional(),
  comments: z.string().max(1000, 'Comments too long').optional(),
  reportUrl: z.string().url('Invalid URL format').optional(),
  isVerified: z.boolean().optional()
});

// Invoice validations
export const invoiceItemSchema = z.object({
  type: z.enum(['test', 'package']),
  item: objectIdSchema,
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').int('Quantity must be an integer'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative')
});

export const createInvoiceSchema = z.object({
  testOrder: objectIdSchema,
  patient: objectIdSchema,
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  discountPercentage: z.number().min(0, 'Discount percentage cannot be negative').max(100, 'Discount percentage cannot exceed 100').default(0),
  taxPercentage: z.number().min(0, 'Tax percentage cannot be negative').max(100, 'Tax percentage cannot exceed 100').default(0),
  paymentMethod: z.enum(['cash', 'card', 'online', 'bank_transfer']).optional(),
  paymentReference: z.string().max(100, 'Payment reference too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional()
});

export const updateInvoiceSchema = z.object({
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional(),
  paymentMethod: z.enum(['cash', 'card', 'online', 'bank_transfer']).optional(),
  paymentReference: z.string().max(100, 'Payment reference too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  isActive: z.boolean().optional()
});

// Search and filter validations
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10)
});

export const searchSchema = z.object({
  search: z.string().max(100, 'Search query too long').default(''),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// User validations
export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'lab_tech', 'reception', 'patient', 'doctor'])
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean()
});

// Export type definitions
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type CreateTestOrderInput = z.infer<typeof createTestOrderSchema>;
export type UpdateTestOrderInput = z.infer<typeof updateTestOrderSchema>;
export type CreateTestResultInput = z.infer<typeof createTestResultSchema>;
export type UpdateTestResultInput = z.infer<typeof updateTestResultSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;