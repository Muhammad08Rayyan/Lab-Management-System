import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestResult from '@/lib/models/TestResult';
import Patient from '@/lib/models/Patient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find patient record
    const patient = await Patient.findOne({ userId: session.user.id });
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Get patient's test results with populated data
    const results = await TestResult.find({ 
      patient: patient._id,
      status: 'completed' // Only show completed results to patients
    })
      .populate('test', 'testName testCode normalRange')
      .populate('order', 'orderNumber createdAt')
      .sort({ testedDate: -1 })
      .lean();

    return NextResponse.json({ results });

  } catch (error: unknown) {
    console.error('Error fetching patient results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}