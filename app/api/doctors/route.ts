import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Doctor from '@/lib/models/Doctor';

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
    const isActive = searchParams.get('isActive');
    const skip = (page - 1) * limit;

    await connectDB();

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { doctorId: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { clinic: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const doctors = await Doctor.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ firstName: 1, lastName: 1 });

    const total = await Doctor.countDocuments(query);

    return NextResponse.json({
      doctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!['admin', 'reception'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      specialization,
      phone,
      email,
      clinic
    } = body;

    if (!firstName || !lastName || !specialization || !phone) {
      return NextResponse.json({ 
        error: 'Missing required fields: firstName, lastName, specialization, phone' 
      }, { status: 400 });
    }

    await connectDB();

    // Generate unique doctor ID
    const doctorCount = await Doctor.countDocuments();
    const doctorId = `DOC${String(doctorCount + 1).padStart(4, '0')}`;

    const doctor = new Doctor({
      doctorId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      specialization: specialization.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      clinic: clinic?.trim() || '',
      isActive: true
    });

    await doctor.save();

    return NextResponse.json({ 
      message: 'Doctor registered successfully', 
      doctor 
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating doctor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}