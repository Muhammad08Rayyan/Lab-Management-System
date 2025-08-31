import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestResult from '@/lib/models/TestResult';
import TestOrder from '@/lib/models/TestOrder';
import LabTest from '@/lib/models/LabTest';

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
    const patientId = searchParams.get('patientId');
    const testOrderId = searchParams.get('testOrderId');
    const testId = searchParams.get('test');
    const overallStatus = searchParams.get('overallStatus');
    const isVerified = searchParams.get('isVerified');
    const technicianId = searchParams.get('technicianId');
    const skip = (page - 1) * limit;

    await connectDB();

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { comments: { $regex: search, $options: 'i' } }
      ];
    }

    if (patientId) query.patient = patientId;
    if (testOrderId) query.testOrder = testOrderId;
    if (testId) query.test = testId;
    if (overallStatus) query.overallStatus = overallStatus;
    if (technicianId) query.technician = technicianId;
    
    if (isVerified !== null && isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    const results = await TestResult.find(query)
      .populate('testOrder', 'orderNumber orderStatus priority')
      .populate('test', 'code name price')
      .populate('patient', 'firstName lastName email phone patientId dateOfBirth gender')
      .populate('technician', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ reportedDate: -1 });

    const total = await TestResult.countDocuments(query);

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching results:', error);
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
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Only lab technicians can create results' }, { status: 403 });
    }

    const body = await request.json();
    const {
      testOrder,
      test,
      patient,
      resultData,
      overallStatus = 'normal',
      comments,
      reportUrl
    } = body;

    if (!testOrder || !test || !patient || !resultData || !Array.isArray(resultData)) {
      return NextResponse.json({ 
        error: 'Missing required fields: testOrder, test, patient, resultData' 
      }, { status: 400 });
    }

    if (resultData.length === 0) {
      return NextResponse.json({ error: 'At least one result parameter is required' }, { status: 400 });
    }

    await connectDB();

    // Verify test order exists and is in progress
    const order = await TestOrder.findById(testOrder);
    if (!order) {
      return NextResponse.json({ error: 'Test order not found' }, { status: 404 });
    }

    if (order.orderStatus !== 'in_progress') {
      return NextResponse.json({ 
        error: 'Results can only be added to orders in progress' 
      }, { status: 400 });
    }

    // Verify test exists and is part of the order
    const labTest = await LabTest.findById(test);
    if (!labTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (!order.tests.includes(test)) {
      return NextResponse.json({ 
        error: 'Test is not part of this order' 
      }, { status: 400 });
    }

    // Check if result already exists for this test and order
    const existingResult = await TestResult.findOne({ testOrder, test });
    if (existingResult) {
      // Update existing result instead of creating new one
      existingResult.resultData = resultData;
      existingResult.overallStatus = overallStatus;
      existingResult.comments = comments;
      existingResult.reportUrl = reportUrl;
      existingResult.technician = session.user.id;
      existingResult.reportedDate = new Date();
      
      await existingResult.save();
      
      // Populate the result before returning
      await existingResult.populate([
        { path: 'testOrder', select: 'orderNumber orderStatus priority' },
        { path: 'test', select: 'code name price' },
        { path: 'patient', select: 'firstName lastName email phone patientId dateOfBirth gender' },
        { path: 'technician', select: 'firstName lastName email' }
      ]);
      
      return NextResponse.json({ 
        message: 'Test result updated successfully', 
        result: existingResult 
      }, { status: 200 });
    }

    // Validate result data format
    for (const data of resultData) {
      if (!data.parameter || !data.value) {
        return NextResponse.json({ 
          error: 'Each result parameter must have parameter and value fields' 
        }, { status: 400 });
      }
    }

    const result = new TestResult({
      testOrder,
      test,
      patient,
      technician: session.user.id,
      resultData,
      overallStatus,
      comments,
      reportUrl
    });

    await result.save();

    // Populate the result before returning
    await result.populate([
      { path: 'testOrder', select: 'orderNumber orderStatus priority' },
      { path: 'test', select: 'code name price' },
      { path: 'patient', select: 'firstName lastName email phone patientId' },
      { path: 'technician', select: 'firstName lastName email' }
    ]);

    return NextResponse.json({ 
      message: 'Test result created successfully', 
      result 
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}