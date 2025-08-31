import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import TestResult from '@/lib/models/TestResult';
import Patient from '@/lib/models/Patient';
import LabTest from '@/lib/models/LabTest';
import User from '@/lib/models/User';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!['admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Only admin can create sample data' }, { status: 403 });
    }

    await connectDB();

    // Check if we already have data
    const existingOrders = await TestOrder.countDocuments({});
    if (existingOrders > 0) {
      return NextResponse.json({ 
        message: 'Sample data already exists',
        existingOrders 
      });
    }

    // Create sample lab tests
    const sampleTests = await LabTest.create([
      {
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        price: 25.00
      },
      {
        testCode: 'BMP',
        testName: 'Basic Metabolic Panel',
        price: 35.00
      },
      {
        testCode: 'LIPID',
        testName: 'Lipid Panel',
        price: 45.00
      }
    ]);

    // Find or create a patient user
    let patientUser = await User.findOne({ role: 'patient' });
    if (!patientUser) {
      // Create a sample patient user
      patientUser = await User.create({
        email: 'patient@example.com',
        password: '$2a$10$dummy.hash.for.sample.user', // This won't work for real login
        role: 'patient',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-0123',
        isActive: true
      });
    }

    // Create patient record
    let patientRecord = await Patient.findOne({ userId: patientUser._id });
    if (!patientRecord) {
      patientRecord = await Patient.create({
        userId: patientUser._id,
        firstName: patientUser.firstName,
        lastName: patientUser.lastName,
        email: patientUser.email,
        phone: patientUser.phone,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        address: {
          street: '123 Main St',
          city: 'Sample City',
          state: 'SC',
          zipCode: '12345'
        },
        emergencyContact: {
          name: 'Jane Doe',
          phone: '555-0124',
          relationship: 'Spouse'
        },
        medicalHistory: []
      });
    }

    // Create sample orders
    const sampleOrders = await TestOrder.create([
      {
        patient: patientRecord._id,
        tests: [sampleTests[0]._id], // CBC
        totalAmount: sampleTests[0].price,
        priority: 'normal',
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        createdBy: session.user.id
      },
      {
        patient: patientRecord._id,
        tests: [sampleTests[1]._id], // BMP
        totalAmount: sampleTests[1].price,
        priority: 'urgent',
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        createdBy: session.user.id
      },
      {
        patient: patientRecord._id,
        tests: [sampleTests[2]._id], // Lipid Panel
        totalAmount: sampleTests[2].price,
        priority: 'stat',
        orderStatus: 'in_progress',
        paymentStatus: 'paid',
        createdBy: session.user.id
      }
    ]);

    // Create a sample result for demonstration
    await TestResult.create({
      testOrder: sampleOrders[2]._id, // The in-progress order
      test: sampleTests[2]._id,
      patient: patientRecord._id,
      technician: session.user.id,
      resultData: [
        {
          parameter: 'Total Cholesterol',
          value: '200',
          unit: 'mg/dL',
          normalRange: '<200',
          flag: 'normal'
        },
        {
          parameter: 'HDL Cholesterol',
          value: '45',
          unit: 'mg/dL',
          normalRange: '>40',
          flag: 'normal'
        }
      ],
      overallStatus: 'normal',
      comments: 'All lipid levels within normal range.',
      reportedDate: new Date()
    });

    return NextResponse.json({
      message: 'Sample data created successfully',
      created: {
        tests: sampleTests.length,
        patient: 1,
        orders: sampleOrders.length,
        results: 1
      },
      orderNumbers: sampleOrders.map(o => o.orderNumber)
    });

  } catch (error: unknown) {
    console.error('Error creating sample data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}