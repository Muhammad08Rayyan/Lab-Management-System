import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find patient record by user ID
    const patient = await Patient.findOne({ userId: session.user.id });
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    return NextResponse.json({ patient });

  } catch (error: any) {
    console.error('Error fetching patient profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      address,
      emergencyContact,
      medicalHistory
    } = body;

    await connectDB();

    // Find and update patient record
    const patient = await Patient.findOneAndUpdate(
      { userId: session.user.id },
      {
        firstName,
        lastName,
        phone,
        address,
        emergencyContact,
        medicalHistory
      },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Also update the user record with basic info
    await User.findByIdAndUpdate(
      session.user.id,
      {
        firstName,
        lastName,
        phone
      }
    );

    return NextResponse.json({ 
      message: 'Profile updated successfully', 
      patient 
    });

  } catch (error: any) {
    console.error('Error updating patient profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}