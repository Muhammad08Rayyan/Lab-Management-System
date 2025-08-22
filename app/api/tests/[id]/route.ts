import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';
import TestCategory from '@/lib/models/TestCategory';
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
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    await connectDB();

    const test = await LabTest.findById(id).populate('category', 'name description');
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error: any) {
    console.error('Error fetching test:', error);
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
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      testCode,
      testName,
      category,
      description,
      price,
      normalRange,
      sampleType,
      reportingTime,
      instructions,
      isActive
    } = body;

    await connectDB();

    const test = await LabTest.findById(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // If category is being updated, verify it exists
    if (category && category !== test.category.toString()) {
      const categoryExists = await TestCategory.findById(category);
      if (!categoryExists) {
        return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
      }
    }

    // Check if test code is being changed and if it already exists
    if (testCode && testCode.toUpperCase() !== test.testCode) {
      const existingTest = await LabTest.findOne({ 
        testCode: testCode.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingTest) {
        return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
      }
    }

    const updatedTest = await LabTest.findByIdAndUpdate(
      id,
      {
        ...(testCode && { testCode: testCode.toUpperCase() }),
        ...(testName && { testName }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(normalRange !== undefined && { normalRange }),
        ...(sampleType && { sampleType }),
        ...(reportingTime && { reportingTime }),
        ...(instructions !== undefined && { instructions }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    ).populate('category', 'name description');

    return NextResponse.json({ 
      message: 'Test updated successfully', 
      test: updatedTest 
    });
  } catch (error: any) {
    console.error('Error updating test:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }
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
      return NextResponse.json({ error: 'Only admins can delete tests' }, { status: 403 });
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    await connectDB();

    const test = await LabTest.findByIdAndDelete(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Test deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}