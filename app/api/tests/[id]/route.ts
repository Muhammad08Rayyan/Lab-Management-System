import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';
import mongoose from 'mongoose';

interface SessionUser {
  id: string;
  role: string;
  email: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    await connectDB();

    const test = await LabTest.findById(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error: unknown) {
    console.error('Error fetching test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    const body = await request.json();
    const { code, name, price } = body;

    await connectDB();

    const test = await LabTest.findById(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check if test code is being changed and if it already exists
    if (code && code.toUpperCase() !== test.code) {
      const existingTest = await LabTest.findOne({ 
        code: code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingTest) {
        return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
      }
    }

    const updatedTest = await LabTest.findByIdAndUpdate(
      id,
      {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(price !== undefined && { price })
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      message: 'Test updated successfully', 
      test: updatedTest 
    });
  } catch (error: unknown) {
    console.error('Error updating test:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete tests' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    await connectDB();

    const test = await LabTest.findByIdAndDelete(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Test deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}