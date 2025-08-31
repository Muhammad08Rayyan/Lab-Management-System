import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import Patient from '@/lib/models/Patient';
import LabTest from '@/lib/models/LabTest';
import TestPackage from '@/lib/models/TestPackage';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const orderStatus = searchParams.get('orderStatus');
    const paymentStatus = searchParams.get('paymentStatus');
    const priority = searchParams.get('priority');
    const patientId = searchParams.get('patientId');
    const skip = (page - 1) * limit;

    await connectDB();

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (orderStatus) {
      // Support multiple order statuses separated by comma
      const statuses = orderStatus.split(',').map(s => s.trim());
      query.orderStatus = statuses.length > 1 ? { $in: statuses } : orderStatus;
    }
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (priority) query.priority = priority;
    if (patientId) query.patient = patientId;

    const orders = await TestOrder.find(query)
      .populate('patient', 'firstName lastName email phone patientId dateOfBirth gender')
      .populate('doctor', 'firstName lastName email')
      .populate('tests', 'code name price')
      .populate('packages', 'packageName price')
      .populate('createdBy', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await TestOrder.countDocuments(query);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!['admin', 'reception', 'doctor'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      patient,
      doctor,
      tests = [],
      packages = [],
      priority = 'normal',
      sampleCollectionDate,
      expectedReportDate,
      notes,
      paymentMethod = 'cash'
    } = body;

    if (!patient) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    if (tests.length === 0 && packages.length === 0) {
      return NextResponse.json({ error: 'At least one test or package must be selected' }, { status: 400 });
    }

    await connectDB();

    console.log('Request body:', { patient, tests, packages, priority, notes });
    
    // First, check if patient ID is valid ObjectId
    if (!patient || !patient.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: 'Invalid patient ID format' }, { status: 400 });
    }

    // Find or create patient record for the user
    let patientRecord = await Patient.findOne({ userId: patient });
    console.log('Found existing patient record:', patientRecord ? 'Yes' : 'No');
    if (!patientRecord) {
      // Get user details to create patient record
      const user = await User.findById(patient);
      console.log('Found user for patient creation:', user ? `${user.firstName} ${user.lastName}` : 'No');
      if (!user || user.role !== 'patient') {
        return NextResponse.json({ error: 'Patient user not found' }, { status: 404 });
      }
      
      console.log('Creating new patient record...');
      console.log('User data for patient:', {
        userId: patient,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      });
      
      try {
        // Create patient record automatically
        patientRecord = await Patient.create({
          userId: patient,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
          dateOfBirth: new Date('1990-01-01'), // Default date, should be updated by patient
          gender: 'other', // Default, should be updated by patient
          address: {},
          emergencyContact: {},
          medicalHistory: []
        });
        console.log('Patient record created successfully:', patientRecord.patientId);
      } catch (patientError) {
        console.error('Detailed patient creation error:', {
          message: patientError instanceof Error ? patientError.message : 'Unknown error',
          name: patientError instanceof Error ? patientError.name : 'Unknown',
          errors: patientError instanceof Error && 'errors' in patientError ? (patientError as { errors: unknown }).errors : undefined,
          stack: patientError instanceof Error ? patientError.stack : undefined
        });
        return NextResponse.json({ 
          error: 'Failed to create patient record', 
          details: patientError instanceof Error ? patientError.message : 'Unknown error',
          validation: patientError instanceof Error && 'errors' in patientError ? (patientError as { errors: unknown }).errors : undefined
        }, { status: 500 });
      }
    }

    // Calculate total amount
    let totalAmount = 0;

    // Add test prices
    if (tests.length > 0) {
      console.log('Looking for tests with IDs:', tests);
      const labTests = await LabTest.find({ _id: { $in: tests } });
      console.log('Found tests:', labTests.length, 'out of', tests.length);
      if (labTests.length !== tests.length) {
        console.log('Missing tests. Found:', labTests.map(t => t._id), 'Expected:', tests);
        return NextResponse.json({ error: 'One or more tests not found' }, { status: 404 });
      }
      totalAmount += labTests.reduce((sum, test) => sum + test.price, 0);
      console.log('Total amount calculated:', totalAmount);
    }

    // Add package prices
    if (packages && packages.length > 0) {
      const testPackages = await TestPackage.find({ _id: { $in: packages } });
      if (testPackages.length !== packages.length) {
        return NextResponse.json({ error: 'One or more packages not found' }, { status: 404 });
      }
      totalAmount += testPackages.reduce((sum, pkg) => sum + pkg.packagePrice, 0);
    }

    console.log('Creating order with total amount:', totalAmount);
    console.log('Patient record ID:', patientRecord._id);
    console.log('Tests:', tests);
    console.log('User ID:', session.user.id);

    const order = new TestOrder({
      patient: patientRecord._id,
      doctor,
      tests,
      packages: packages || [],
      totalAmount,
      priority,
      sampleCollectionDate: sampleCollectionDate ? new Date(sampleCollectionDate) : undefined,
      expectedReportDate: expectedReportDate ? new Date(expectedReportDate) : undefined,
      notes,
      paymentMethod,
      createdBy: session.user.id
    });

    try {
      await order.save();
      console.log('Order saved successfully with order number:', order.orderNumber);
    } catch (orderError) {
      console.error('Error saving order:', orderError);
      return NextResponse.json({ 
        error: 'Failed to create order', 
        details: orderError instanceof Error ? orderError.message : 'Unknown error',
        validation: orderError instanceof Error && 'errors' in orderError ? (orderError as { errors: unknown }).errors : undefined
      }, { status: 500 });
    }

    // Populate the order before returning
    await order.populate([
      { path: 'patient', select: 'firstName lastName email phone patientId' },
      { path: 'doctor', select: 'firstName lastName email' },
      { path: 'tests', select: 'testCode testName price' },
      { path: 'packages', select: 'packageName packagePrice' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    return NextResponse.json({ 
      message: 'Order created successfully', 
      order 
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}