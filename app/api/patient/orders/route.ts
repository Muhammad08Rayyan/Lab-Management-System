import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
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

    // Get patient's test orders with populated data
    const orders = await TestOrder.find({ patient: patient._id })
      .populate('tests', 'testName testCode price')
      .populate('packages', 'packageName packageCode packagePrice')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders });

  } catch (error: unknown) {
    console.error('Error fetching patient orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}