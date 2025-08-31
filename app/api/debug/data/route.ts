import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import TestResult from '@/lib/models/TestResult';
import Patient from '@/lib/models/Patient';
import LabTest from '@/lib/models/LabTest';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    // Get basic counts
    const totalOrders = await TestOrder.countDocuments({});
    const totalResults = await TestResult.countDocuments({});
    const totalPatients = await Patient.countDocuments({});
    const totalTests = await LabTest.countDocuments({});

    // Get order status breakdown
    const ordersByStatus = await TestOrder.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await TestOrder.find({})
      .populate('patient', 'firstName lastName patientId')
      .populate('tests', 'testCode testName')
      .sort({ createdAt: -1 })
      .limit(5);

    return NextResponse.json({
      totals: {
        orders: totalOrders,
        results: totalResults,
        patients: totalPatients,
        tests: totalTests
      },
      ordersByStatus,
      recentOrders
    });

  } catch (error: unknown) {
    console.error('Error fetching debug data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}