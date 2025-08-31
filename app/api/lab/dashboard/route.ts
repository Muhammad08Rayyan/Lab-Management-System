import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import TestResult from '@/lib/models/TestResult';

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

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get pending tests (pending and confirmed orders that haven't been processed)
    const pendingTests = await TestOrder.countDocuments({
      orderStatus: { $in: ['pending', 'confirmed'] }
    });
    console.log('Pending tests found:', pendingTests);

    // Get in-progress tests
    const inProgressTests = await TestOrder.countDocuments({
      orderStatus: 'in_progress'
    });
    console.log('In-progress tests found:', inProgressTests);

    // Get completed tests today
    const completedToday = await TestResult.countDocuments({
      reportedDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    console.log('Completed today found:', completedToday);

    // Get total samples (approximating as total test orders)
    const totalSamples = await TestOrder.countDocuments({
      orderStatus: { $in: ['pending', 'confirmed', 'in_progress', 'completed'] }
    });
    console.log('Total samples found:', totalSamples);

    // Also check total orders and results for debugging
    const totalOrders = await TestOrder.countDocuments({});
    const totalResults = await TestResult.countDocuments({});
    console.log('DEBUG - Total orders in DB:', totalOrders);
    console.log('DEBUG - Total results in DB:', totalResults);

    return NextResponse.json({
      stats: {
        pendingTests,
        inProgressTests,
        completedToday,
        totalSamples
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching lab dashboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}