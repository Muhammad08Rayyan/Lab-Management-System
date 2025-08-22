import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import TestOrder from '@/lib/models/TestOrder';

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
    const paymentStatus = searchParams.get('paymentStatus');
    const patientId = searchParams.get('patientId');
    const isActive = searchParams.get('isActive');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const skip = (page - 1) * limit;

    await connectDB();

    let query: any = {};

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (patientId) query.patient = patientId;
    
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.issueDate = {};
      if (dateFrom) query.issueDate.$gte = new Date(dateFrom);
      if (dateTo) query.issueDate.$lte = new Date(dateTo);
    }

    const invoices = await Invoice.find(query)
      .populate('testOrder', 'orderNumber orderStatus')
      .populate('patient', 'firstName lastName email phone patientId')
      .populate('createdBy', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ issueDate: -1 });

    const total = await Invoice.countDocuments(query);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'reception'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      testOrder,
      patient,
      items,
      discountPercentage = 0,
      taxPercentage = 0,
      paymentMethod,
      paymentReference,
      notes
    } = body;

    if (!testOrder || !patient || !items || !Array.isArray(items)) {
      return NextResponse.json({ 
        error: 'Missing required fields: testOrder, patient, items' 
      }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    await connectDB();

    // Verify test order exists
    const order = await TestOrder.findById(testOrder).populate(['tests', 'packages']);
    if (!order) {
      return NextResponse.json({ error: 'Test order not found' }, { status: 404 });
    }

    // Check if invoice already exists for this order
    const existingInvoice = await Invoice.findOne({ testOrder, isActive: true });
    if (existingInvoice) {
      return NextResponse.json({ 
        error: 'Active invoice already exists for this order' 
      }, { status: 409 });
    }

    // Validate items
    for (const item of items) {
      if (!item.type || !item.item || !item.name || !item.unitPrice || !item.quantity) {
        return NextResponse.json({ 
          error: 'Each item must have type, item, name, unitPrice, and quantity' 
        }, { status: 400 });
      }
      
      if (!['test', 'package'].includes(item.type)) {
        return NextResponse.json({ 
          error: 'Item type must be either "test" or "package"' 
        }, { status: 400 });
      }

      // Calculate total price for each item
      item.totalPrice = item.unitPrice * item.quantity;
    }

    const invoice = new Invoice({
      testOrder,
      patient,
      items,
      discountPercentage,
      taxPercentage,
      paymentMethod,
      paymentReference,
      notes,
      createdBy: session.user.id
    });

    await invoice.save();

    // Populate the invoice before returning
    await invoice.populate([
      { path: 'testOrder', select: 'orderNumber orderStatus' },
      { path: 'patient', select: 'firstName lastName email phone patientId' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    return NextResponse.json({ 
      message: 'Invoice created successfully', 
      invoice 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}