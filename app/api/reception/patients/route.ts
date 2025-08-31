import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'reception'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Reception or Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    await connectDB();

    // Build query for patient users only
    const query: Record<string, unknown> = { role: 'patient' };
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(query);

    return NextResponse.json({ 
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: unknown) {
    console.error('Get patient users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'reception'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Reception or Admin access required' },
        { status: 403 }
      );
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      medicalHistory
    } = await req.json();

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create new patient user (role is locked to patient)
    const userData: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      phone,
      password,
      role: 'patient',
      isActive: true,
    };

    // Add optional fields if provided
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);
    if (gender) userData.gender = gender;
    if (address) userData.address = address;
    if (emergencyContact) userData.emergencyContact = emergencyContact;
    if (medicalHistory) userData.medicalHistory = medicalHistory;

    const user = await User.create(userData);

    // Return user without password
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return NextResponse.json({ 
      message: 'Patient created successfully', 
      user: userWithoutPassword 
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Create patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}