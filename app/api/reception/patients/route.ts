import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'reception'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Reception or Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    // Only fetch users with patient role
    const users = await User.find({ role: 'patient' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });

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

    const { firstName, lastName, email, phone, password } = await req.json();

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
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: 'patient',
      isActive: true,
    });

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