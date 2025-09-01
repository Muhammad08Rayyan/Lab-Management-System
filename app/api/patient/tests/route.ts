import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestResult from '@/lib/models/TestResult';
import TestOrder from '@/lib/models/TestOrder';
// Import required models for population
import '@/lib/models/LabTest';
import '@/lib/models/TestPackage';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admin to view all tests, patients only their own
    if (session.user.role !== 'patient' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    let patientOrders = [];
    
    // If patient, filter by their user ID
    if (session.user.role === 'patient') {
      // First find the patient record for this user
      const Patient = (await import('@/lib/models/Patient')).default;
      const patient = await Patient.findOne({ userId: session.user.id });
      
      if (!patient) {
        return NextResponse.json({ 
          success: true, 
          testsByOrder: [], 
          allTests: [] 
        });
      }
      
      // Get all orders for this patient
      patientOrders = await TestOrder.find({ 
        patient: patient._id 
      })
      .populate('patient', 'firstName lastName patientId')
      .sort({ createdAt: -1 });
      
    } else {
      // Admin can see all orders
      patientOrders = await TestOrder.find({})
      .populate('patient', 'firstName lastName patientId')
      .sort({ createdAt: -1 });
    }

    // For each order, get the associated test results
    const testsByOrder = [];
    
    for (const order of patientOrders) {
      // Get the populated order with tests and packages
      const populatedOrder = await TestOrder.findById(order._id)
        .populate({
          path: 'tests',
          select: 'name code price'
        })
        .populate({
          path: 'packages',
          select: 'packageName packageCode packagePrice',
          populate: {
            path: 'tests',
            select: 'name code price'
          }
        })
        .populate('patient', 'firstName lastName patientId');

      // Get test results for this order (note: field is testOrder not order)
      const testResults = await TestResult.find({ testOrder: order._id })
        .populate({
          path: 'test',
          select: 'code name price normalRange sampleType description'
        })
        .populate({
          path: 'technician',
          select: 'firstName lastName'
        })
        .sort({ createdAt: -1 });

      // Count total tests (individual tests + tests in packages)
      const individualTestsCount = populatedOrder.tests ? populatedOrder.tests.length : 0;
      const packageTestsCount = populatedOrder.packages 
        ? populatedOrder.packages.reduce((count: number, pkg: { tests?: unknown[] }) => count + (pkg.tests ? pkg.tests.length : 0), 0)
        : 0;
      const totalTestsCount = individualTestsCount + packageTestsCount;

      testsByOrder.push({
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          patient: order.patient,
          totalTestsCount: totalTestsCount,
          tests: (populatedOrder.tests || []).map((test: { toObject: () => Record<string, unknown>; name: string; code: string }) => ({
            ...test.toObject(),
            testName: test.name,
            testCode: test.code
          })),
          packages: (populatedOrder.packages || []).map((pkg: { toObject: () => Record<string, unknown>; tests?: { toObject: () => Record<string, unknown>; name: string; code: string }[] }) => ({
            ...pkg.toObject(),
            tests: (pkg.tests || []).map((test: { toObject: () => Record<string, unknown>; name: string; code: string }) => ({
              ...test.toObject(),
              testName: test.name,
              testCode: test.code
            }))
          }))
        },
        tests: testResults
      });
    }

    return NextResponse.json({ 
      success: true,
      testsByOrder: testsByOrder,
      allTests: [] // We can populate this if needed
    });

  } catch (error: unknown) {
    console.error('Error fetching patient tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}