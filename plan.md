# Lab Management System - Implementation Plan

## Project Overview
A comprehensive lab management system to automate lab operations and streamline patient diagnostic workflows with multi-role access and real-time features.

## Technology Stack
- **Frontend/Backend**: Next.js 14 with App Router
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: Cloudinary
- **Authentication**: NextAuth.js
- **PDF Generation**: jsPDF or Puppeteer
- **Email Service**: Nodemailer
- **Barcode**: QuaggaJS
- **Charts**: Chart.js or Recharts
- **UI Components**: Tailwind CSS + Headless UI

## Credentials & Configuration
```env
# MongoDB
MONGODB_URI=mongodb+srv://muhammadrayyandev08:qfEdbWwyZYPvdUcb@main.33ddztf.mongodb.net/lab_management

# Cloudinary
CLOUDINARY_CLOUD_NAME=dbf0jdb06
CLOUDINARY_API_KEY=462934827239192
CLOUDINARY_API_SECRET=gUYMyKLxwu6p49r9jLYmd5bi858
CLOUDINARY_FOLDER=Lab

# NextAuth (generate random secrets)
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## User Roles & Permissions

### 1. Admin/Manager
- Full system access
- Manage all users (patients, doctors, lab technicians)
- Configure lab packages and test profiles
- View comprehensive dashboards and reports
- System settings and configurations

### 2. Lab Technicians
- Manage test requests
- Update sample status (Received → Processing → Completed)
- Barcode scanning and sample tagging
- Upload test results and reports
- View assigned tests only

### 3. Reception/Front Desk
- Patient registration and management
- Create test orders
- Process payments and generate invoices
- Print receipts and labels
- Schedule appointments

### 4. Patients
- Personal dashboard access
- View test history
- Download test reports (PDF)
- Receive email notifications
- Update personal information

### 5. Doctors
- View referred patients
- Access test reports
- Patient history overview

## Database Schema Design

### Core Models

#### 1. Users
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  role: ['admin', 'lab_tech', 'reception', 'patient', 'doctor'],
  firstName: String,
  lastName: String,
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Patients
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  patientId: String (unique),
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  dateOfBirth: Date,
  gender: ['male', 'female', 'other'],
  address: Object,
  emergencyContact: Object,
  medicalHistory: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. Doctors
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  doctorId: String (unique),
  firstName: String,
  lastName: String,
  specialization: String,
  phone: String,
  email: String,
  clinic: String,
  isActive: Boolean,
  createdAt: Date
}
```

#### 4. Lab Technicians
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  techId: String (unique),
  firstName: String,
  lastName: String,
  specialization: [String],
  phone: String,
  email: String,
  shift: ['morning', 'evening', 'night'],
  isActive: Boolean,
  createdAt: Date
}
```

#### 5. Test Categories
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  isActive: Boolean,
  createdAt: Date
}
```

#### 6. Lab Tests
```javascript
{
  _id: ObjectId,
  testCode: String (unique),
  testName: String,
  category: ObjectId (ref: TestCategories),
  description: String,
  price: Number,
  normalRange: String,
  sampleType: String,
  reportingTime: String,
  instructions: String,
  isActive: Boolean,
  createdAt: Date
}
```

#### 7. Test Packages
```javascript
{
  _id: ObjectId,
  packageCode: String (unique),
  packageName: String,
  tests: [ObjectId] (ref: LabTests),
  originalPrice: Number,
  packagePrice: Number,
  discount: Number,
  description: String,
  isActive: Boolean,
  createdAt: Date
}
```

#### 8. Test Orders
```javascript
{
  _id: ObjectId,
  orderNumber: String (unique),
  patient: ObjectId (ref: Patients),
  doctor: ObjectId (ref: Doctors),
  tests: [ObjectId] (ref: LabTests),
  packages: [ObjectId] (ref: TestPackages),
  totalAmount: Number,
  paidAmount: Number,
  paymentStatus: ['pending', 'partial', 'paid'],
  paymentMethod: ['cash', 'card', 'online'],
  orderStatus: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
  priority: ['normal', 'urgent', 'stat'],
  sampleCollectionDate: Date,
  expectedReportDate: Date,
  notes: String,
  createdBy: ObjectId (ref: Users),
  createdAt: Date,
  updatedAt: Date
}
```

#### 9. Test Results
```javascript
{
  _id: ObjectId,
  order: ObjectId (ref: TestOrders),
  patient: ObjectId (ref: Patients),
  test: ObjectId (ref: LabTests),
  sampleId: String,
  barcode: String,
  status: ['received', 'processing', 'completed', 'rejected'],
  result: String,
  normalRange: String,
  unit: String,
  flag: ['normal', 'high', 'low', 'critical'],
  comments: String,
  testedBy: ObjectId (ref: LabTechnicians),
  testedDate: Date,
  approvedBy: ObjectId (ref: Users),
  approvedDate: Date,
  reportUrl: String (Cloudinary URL),
  createdAt: Date,
  updatedAt: Date
}
```

#### 10. Invoices
```javascript
{
  _id: ObjectId,
  invoiceNumber: String (unique),
  order: ObjectId (ref: TestOrders),
  patient: ObjectId (ref: Patients),
  items: [Object],
  subtotal: Number,
  discount: Number,
  tax: Number,
  total: Number,
  paymentStatus: ['pending', 'paid'],
  paymentMethod: String,
  dueDate: Date,
  paidDate: Date,
  createdBy: ObjectId (ref: Users),
  createdAt: Date
}
```

## Implementation Phases

### Phase 1: Project Setup & Authentication (Week 1-2)
1. **Environment Setup**
   - Initialize Next.js project with TypeScript
   - Install required dependencies
   - Set up environment variables
   - Configure MongoDB connection
   - Set up Cloudinary integration

2. **Authentication System**
   - Implement NextAuth.js with credentials provider
   - Create login/register pages
   - Set up role-based middleware
   - Create protected route wrapper
   - Implement password hashing and validation

3. **Basic UI Framework**
   - Set up Tailwind CSS
   - Create layout components
   - Design responsive navigation
   - Implement role-based menu system

### Phase 2: Core Models & Database (Week 2-3)
1. **Database Models**
   - Create Mongoose schemas for all entities
   - Set up database relationships
   - Implement validation rules
   - Create database seeders for test data

2. **API Endpoints Foundation**
   - Set up API route structure
   - Create CRUD operations for core entities
   - Implement error handling middleware
   - Add request validation

### Phase 3: User Management (Week 3-4)
1. **Admin Panel**
   - User management dashboard
   - Create/edit/delete users
   - Role assignment
   - User activity monitoring

2. **Profile Management**
   - User profile pages

### Phase 4: Patient Management (Week 4-5)
1. **Patient Registration**
   - Registration form with validation
   - Patient ID generation
   - Medical history tracking

2. **Patient Portal**
   - Patient dashboard
   - Test history view
   - Report download functionality
   - Profile management

### Phase 5: Test Management (Week 5-6)
1. **Test Configuration**
   - Manage lab tests and categories
   - Create test packages
   - Price management
   - Test profile setup

2. **Test Ordering System**
   - Create test orders
   - Order management interface
   - Payment processing
   - Invoice generation

### Phase 6: Lab Operations (Week 6-7)
1. **Sample Management**
   - Barcode generation and scanning
   - Sample tracking system
   - Status updates workflow

2. **Result Entry**
   - Test result input forms
   - Result validation
   - Approval workflow
   - Quality control

### Phase 7: Reports & Analytics (Week 7-8)
1. **Report Generation**
   - PDF report templates
   - Automated report generation
   - Email notifications
   - Report history

2. **Dashboard & Analytics**
   - Real-time dashboard
   - Revenue tracking
   - Test statistics
   - Performance metrics

### Phase 8: Advanced Features (Week 8-9)
1. **Barcode Integration**
   - Sample labeling system
   - Barcode scanning interface
   - Mobile-responsive scanning

2. **Email Notifications**
   - Automated email system
   - Report ready notifications
   - Appointment reminders

### Phase 9: Reporting System (Week 9-10)
1. **Financial Reports**
   - Daily/weekly/monthly reports
   - Income vs expense analysis
   - Doctor-wise reports
   - Test-wise performance

2. **Export Functionality**
   - PDF export for all reports
   - Excel export capability
   - Custom report filters

### Phase 10: Testing & Deployment (Week 10-12)
1. **Quality Assurance**
   - Unit testing
   - Integration testing
   - User acceptance testing
   - Performance optimization

2. **Deployment**
   - Production environment setup
   - Database migration
   - SSL certificate configuration
   - Monitoring setup

## API Endpoints Structure

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- POST `/api/auth/logout` - User logout
- GET `/api/auth/me` - Get current user

### Users
- GET `/api/users` - Get all users
- POST `/api/users` - Create user
- GET `/api/users/[id]` - Get user by ID
- PUT `/api/users/[id]` - Update user
- DELETE `/api/users/[id]` - Delete user

### Patients
- GET `/api/patients` - Get all patients
- POST `/api/patients` - Create patient
- GET `/api/patients/[id]` - Get patient by ID
- PUT `/api/patients/[id]` - Update patient
- DELETE `/api/patients/[id]` - Delete patient

### Tests
- GET `/api/tests` - Get all tests
- POST `/api/tests` - Create test
- GET `/api/tests/[id]` - Get test by ID
- PUT `/api/tests/[id]` - Update test
- DELETE `/api/tests/[id]` - Delete test

### Orders
- GET `/api/orders` - Get all orders
- POST `/api/orders` - Create order
- GET `/api/orders/[id]` - Get order by ID
- PUT `/api/orders/[id]` - Update order
- DELETE `/api/orders/[id]` - Cancel order

### Results
- GET `/api/results` - Get all results
- POST `/api/results` - Create result
- GET `/api/results/[id]` - Get result by ID
- PUT `/api/results/[id]` - Update result

### Reports
- GET `/api/reports/dashboard` - Dashboard data
- GET `/api/reports/financial` - Financial reports
- GET `/api/reports/tests` - Test reports
- POST `/api/reports/generate` - Generate custom report

## Security Considerations

1. **Authentication & Authorization**
   - JWT token-based authentication
   - Role-based access control
   - Session management
   - Password encryption

2. **Data Protection**
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection
   - CSRF protection

3. **File Security**
   - Secure file uploads to Cloudinary
   - File type validation
   - Access control for sensitive documents

4. **API Security**
   - Rate limiting
   - CORS configuration
   - API key management
   - Request logging

## Performance Optimization

1. **Database Optimization**
   - Proper indexing strategy
   - Query optimization
   - Connection pooling
   - Caching frequently accessed data

2. **Frontend Optimization**
   - Code splitting
   - Image optimization
   - Lazy loading
   - Service workers for offline functionality

3. **API Optimization**
   - Response caching
   - Pagination for large datasets
   - Compression middleware
   - Background job processing

## Deployment Strategy

1. **Development Environment**
   - Local development setup
   - Docker containerization
   - Testing database

2. **Production Deployment**
   - Cloud hosting (Vercel/Netlify for frontend)
   - MongoDB Atlas for database
   - Cloudinary for file storage
   - Domain and SSL setup

## Next Steps

1. Set up the development environment
2. Create .env.local file with provided credentials
3. Install required dependencies
4. Set up MongoDB connection and models
5. Implement authentication system
6. Start with user management features

## Required Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "mongoose": "^8.0.0",
    "next-auth": "^4.24.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "cloudinary": "^1.41.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.0",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "quagga": "^0.12.1",
    "@tailwindcss/forms": "^0.5.0",
    "@headlessui/react": "^1.7.0",
    "react-hook-form": "^7.48.0",
    "yup": "^1.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

This plan provides a comprehensive roadmap for building your lab management system with all the specified features and requirements.