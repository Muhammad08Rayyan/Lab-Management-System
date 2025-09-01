import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get raw orders without population to see actual data structure
    const rawOrders = await TestOrder.find({}).limit(5).lean();
    
    // Get populated orders
    const populatedOrders = await TestOrder.find({})
      .populate('patient', 'firstName lastName email phone patientId')
      .populate('tests', 'code name price')
      .limit(5);

    // Count total orders
    const totalOrders = await TestOrder.countDocuments();

    // Check for orders with null patients
    const ordersWithNullPatients = await TestOrder.countDocuments({ patient: null });

    // Check for orders with zero amounts
    const ordersWithZeroAmount = await TestOrder.countDocuments({ totalAmount: { $lte: 0 } });

    return NextResponse.json({
      debug: {
        totalOrders,
        ordersWithNullPatients,
        ordersWithZeroAmount,
        sampleRawOrders: rawOrders,
        samplePopulatedOrders: populatedOrders
      }
    });
  } catch (error: unknown) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}