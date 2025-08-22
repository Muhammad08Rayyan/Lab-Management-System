import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    await connectDB();

    const order = await TestOrder.findById(id)
      .populate('patient', 'firstName lastName email phone patientId dateOfBirth gender address')
      .populate('doctor', 'firstName lastName email phone')
      .populate('tests', 'testCode testName price sampleType reportingTime normalRange')
      .populate('packages', 'packageName price tests')
      .populate('createdBy', 'firstName lastName email');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'reception', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      orderStatus,
      priority,
      sampleCollectionDate,
      expectedReportDate,
      notes,
      paidAmount,
      paymentMethod
    } = body;

    await connectDB();

    const order = await TestOrder.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate status transitions
    if (orderStatus && orderStatus !== order.orderStatus) {
      const validTransitions: Record<string, string[]> = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['in_progress', 'cancelled'],
        'in_progress': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
      };

      if (!validTransitions[order.orderStatus].includes(orderStatus)) {
        return NextResponse.json({ 
          error: `Cannot change status from ${order.orderStatus} to ${orderStatus}` 
        }, { status: 400 });
      }
    }

    // Update payment amount if provided
    let updateData: any = {};
    
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (priority) updateData.priority = priority;
    if (sampleCollectionDate) updateData.sampleCollectionDate = new Date(sampleCollectionDate);
    if (expectedReportDate) updateData.expectedReportDate = new Date(expectedReportDate);
    if (notes !== undefined) updateData.notes = notes;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    
    if (paidAmount !== undefined) {
      updateData.paidAmount = Math.max(0, Math.min(paidAmount, order.totalAmount));
    }

    const updatedOrder = await TestOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'patient', select: 'firstName lastName email phone patientId' },
      { path: 'doctor', select: 'firstName lastName email' },
      { path: 'tests', select: 'testCode testName price' },
      { path: 'packages', select: 'packageName price' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    return NextResponse.json({ 
      message: 'Order updated successfully', 
      order: updatedOrder 
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete orders' }, { status: 403 });
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    await connectDB();

    const order = await TestOrder.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow deletion of pending or cancelled orders
    if (!['pending', 'cancelled'].includes(order.orderStatus)) {
      return NextResponse.json({ 
        error: 'Only pending or cancelled orders can be deleted' 
      }, { status: 400 });
    }

    await TestOrder.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}