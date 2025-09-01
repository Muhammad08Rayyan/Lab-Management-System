import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import mongoose from 'mongoose';

// Special receipt endpoint that handles authentication more gracefully
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Receipt API called');
    
    // Try to get session from various sources
    const session = await getServerSession(authOptions);
    console.log('Receipt session check:', session ? 'exists' : 'null');
    
    const { id } = await params;
    console.log('Receipt order ID received:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format:', id);
      return NextResponse.json({ error: 'Invalid order ID format' }, { status: 400 });
    }

    console.log('Connecting to database...');
    await connectDB();

    // First, let's check if there are any orders at all
    const totalOrders = await TestOrder.countDocuments();
    console.log('Total orders in database:', totalOrders);

    // Check if the specific order exists without populate first
    const orderExists = await TestOrder.exists({ _id: id });
    console.log('Order exists check:', orderExists ? 'yes' : 'no');

    let order;
    try {
      order = await TestOrder.findById(id)
        .populate('patient', 'firstName lastName email phone patientId dateOfBirth gender address')
        .populate('tests', 'code name price')
        .populate('packages', 'packageName price tests')
        .populate('createdBy', 'firstName lastName email');
    } catch (populateError) {
      console.error('Error during populate:', populateError);
      // Try without populate
      order = await TestOrder.findById(id);
      console.log('Order found without populate:', order ? 'yes' : 'no');
    }

    console.log('Order found with populate:', order ? 'yes' : 'no');
    if (order) {
      console.log('Order details:', {
        orderNumber: order.orderNumber,
        patientId: order.patient?._id || 'no patient',
        testsCount: order.tests?.length || 0
      });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found in database' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}