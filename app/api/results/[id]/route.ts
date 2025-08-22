import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestResult from '@/lib/models/TestResult';
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
      return NextResponse.json({ error: 'Invalid result ID' }, { status: 400 });
    }

    await connectDB();

    const result = await TestResult.findById(id)
      .populate('testOrder', 'orderNumber orderStatus priority sampleCollectionDate')
      .populate('test', 'testCode testName normalRange sampleType reportingTime instructions')
      .populate('patient', 'firstName lastName email phone patientId dateOfBirth gender')
      .populate('technician', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Error fetching result:', error);
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
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid result ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      resultData,
      overallStatus,
      comments,
      reportUrl,
      isVerified
    } = body;

    await connectDB();

    const result = await TestResult.findById(id);
    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Only lab technicians can update their own results (if not verified)
    // Only doctors can verify results
    // Admins can do both
    if (userRole === 'lab_tech') {
      if (result.isVerified) {
        return NextResponse.json({ 
          error: 'Cannot modify verified results' 
        }, { status: 403 });
      }
      if (result.technician.toString() !== session.user.id) {
        return NextResponse.json({ 
          error: 'Can only modify your own results' 
        }, { status: 403 });
      }
      if (isVerified !== undefined) {
        return NextResponse.json({ 
          error: 'Lab technicians cannot verify results' 
        }, { status: 403 });
      }
    } else if (userRole === 'doctor') {
      // Doctors can only verify/unverify results
      if (resultData || overallStatus || comments || reportUrl) {
        return NextResponse.json({ 
          error: 'Doctors can only verify/unverify results' 
        }, { status: 403 });
      }
    } else if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let updateData: any = {};

    if (resultData && Array.isArray(resultData)) {
      // Validate result data format
      for (const data of resultData) {
        if (!data.parameter || !data.value) {
          return NextResponse.json({ 
            error: 'Each result parameter must have parameter and value fields' 
          }, { status: 400 });
        }
      }
      updateData.resultData = resultData;
    }

    if (overallStatus) updateData.overallStatus = overallStatus;
    if (comments !== undefined) updateData.comments = comments;
    if (reportUrl !== undefined) updateData.reportUrl = reportUrl;

    // Handle verification
    if (isVerified !== undefined && ['doctor', 'admin'].includes(userRole)) {
      updateData.isVerified = isVerified;
      if (isVerified) {
        updateData.verifiedBy = session.user.id;
        updateData.verifiedDate = new Date();
      } else {
        updateData.verifiedBy = undefined;
        updateData.verifiedDate = undefined;
      }
    }

    const updatedResult = await TestResult.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'testOrder', select: 'orderNumber orderStatus priority' },
      { path: 'test', select: 'testCode testName normalRange sampleType' },
      { path: 'patient', select: 'firstName lastName email phone patientId' },
      { path: 'technician', select: 'firstName lastName email' },
      { path: 'verifiedBy', select: 'firstName lastName email' }
    ]);

    return NextResponse.json({ 
      message: 'Test result updated successfully', 
      result: updatedResult 
    });
  } catch (error: any) {
    console.error('Error updating result:', error);
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
      return NextResponse.json({ error: 'Only admins can delete results' }, { status: 403 });
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid result ID' }, { status: 400 });
    }

    await connectDB();

    const result = await TestResult.findById(id);
    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Only allow deletion of unverified results
    if (result.isVerified) {
      return NextResponse.json({ 
        error: 'Cannot delete verified results' 
      }, { status: 400 });
    }

    await TestResult.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Test result deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}