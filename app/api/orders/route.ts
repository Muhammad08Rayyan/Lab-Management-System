import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import Patient from '@/lib/models/Patient';
import LabTest from '@/lib/models/LabTest';
import TestPackage from '@/lib/models/TestPackage';

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

    let query: any = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (priority) query.priority = priority;
    if (patientId) query.patient = patientId;

    const orders = await TestOrder.find(query)
      .populate('patient', 'firstName lastName email phone patientId')
      .populate('doctor', 'firstName lastName email')
      .populate('tests', 'testCode testName price')
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
  } catch (error: any) {
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

    const userRole = (session.user as any).role;
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

    // Verify patient exists
    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Calculate total amount
    let totalAmount = 0;

    // Add test prices
    if (tests.length > 0) {
      const labTests = await LabTest.find({ _id: { $in: tests } });
      if (labTests.length !== tests.length) {
        return NextResponse.json({ error: 'One or more tests not found' }, { status: 404 });
      }
      totalAmount += labTests.reduce((sum, test) => sum + test.price, 0);
    }

    // Add package prices
    if (packages.length > 0) {
      const testPackages = await TestPackage.find({ _id: { $in: packages } });
      if (testPackages.length !== packages.length) {
        return NextResponse.json({ error: 'One or more packages not found' }, { status: 404 });
      }
      totalAmount += testPackages.reduce((sum, pkg) => sum + pkg.price, 0);
    }

    const order = new TestOrder({
      patient,
      doctor,
      tests,
      packages,
      totalAmount,
      priority,
      sampleCollectionDate: sampleCollectionDate ? new Date(sampleCollectionDate) : undefined,
      expectedReportDate: expectedReportDate ? new Date(expectedReportDate) : undefined,
      notes,
      paymentMethod,
      createdBy: session.user.id
    });

    await order.save();

    // Populate the order before returning
    await order.populate([
      { path: 'patient', select: 'firstName lastName email phone patientId' },
      { path: 'doctor', select: 'firstName lastName email' },
      { path: 'tests', select: 'testCode testName price' },
      { path: 'packages', select: 'packageName price' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    return NextResponse.json({ 
      message: 'Order created successfully', 
      order 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}