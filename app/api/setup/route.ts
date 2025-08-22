import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST() {
  try {
    await connectDB();
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@lab.com' });
    if (existingAdmin) {
      return NextResponse.json({ message: 'Demo users already exist' });
    }

    // Create demo users
    const demoUsers = [
      {
        email: 'admin@lab.com',
        password: 'password123',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890'
      },
      {
        email: 'tech@lab.com',
        password: 'password123',
        role: 'lab_tech',
        firstName: 'Lab',
        lastName: 'Technician',
        phone: '+1234567891'
      },
      {
        email: 'reception@lab.com',
        password: 'password123',
        role: 'reception',
        firstName: 'Reception',
        lastName: 'Staff',
        phone: '+1234567892'
      },
      {
        email: 'patient@lab.com',
        password: 'password123',
        role: 'patient',
        firstName: 'John',
        lastName: 'Patient',
        phone: '+1234567893'
      },
      {
        email: 'doctor@lab.com',
        password: 'password123',
        role: 'doctor',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        phone: '+1234567894'
      }
    ];

    // Create users
    await User.insertMany(demoUsers);

    return NextResponse.json({ 
      message: 'Demo users created successfully',
      users: demoUsers.map(user => ({ email: user.email, role: user.role }))
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create demo users', details: error.message },
      { status: 500 }
    );
  }
}