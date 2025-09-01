import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';

// Debug endpoint to list all orders
export async function GET() {
  try {
    console.log('Debug orders list API called');
    
    await connectDB();
    
    const orders = await TestOrder.find({})
      .select('_id orderNumber patient totalAmount paymentStatus')
      .populate('patient', 'firstName lastName email')
      .limit(10)
      .sort({ createdAt: -1 });
    
    console.log('Found orders:', orders.length);
    
    const ordersList = orders.map(order => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      patient: order.patient,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus
    }));
    
    return NextResponse.json({ 
      total: orders.length,
      orders: ordersList
    });
  } catch (error: unknown) {
    console.error('Error listing orders:', error);
    return NextResponse.json({ 
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}