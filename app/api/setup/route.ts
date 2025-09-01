import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import TestCategory from '@/lib/models/TestCategory';
import LabTest from '@/lib/models/LabTest';

export async function POST() {
  try {
    await connectDB();
    
    // Check if demo data already exists
    const existingAdmin = await User.findOne({ email: 'admin@lab.com' });
    const existingCategories = await TestCategory.countDocuments();
    
    if (existingAdmin || existingCategories > 0) {
      return NextResponse.json({ message: 'Demo data already exists' });
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
      }
    ];

    // Create users
    await User.insertMany(demoUsers);

    // Create demo test categories
    const demoCategories = [
      {
        name: 'Hematology',
        description: 'Blood-related tests including CBC, blood counts, and blood chemistry'
      },
      {
        name: 'Clinical Chemistry',
        description: 'Chemical analysis of blood and body fluids'
      },
      {
        name: 'Microbiology',
        description: 'Tests for infectious diseases and bacterial cultures'
      },
      {
        name: 'Immunology',
        description: 'Tests for immune system function and antibodies'
      },
      {
        name: 'Endocrinology',
        description: 'Hormone-related tests'
      }
    ];

    const createdCategories = await TestCategory.insertMany(demoCategories);

    // Create demo lab tests
    const demoTests = [
      // Hematology tests
      {
        testCode: 'CBC001',
        testName: 'Complete Blood Count',
        category: createdCategories[0]._id,
        description: 'Comprehensive blood test measuring various components',
        price: 500,
        normalRange: 'RBC: 4.5-5.9 M/μL, WBC: 4,500-11,000 cells/μL, Hgb: 14-18 g/dL',
        sampleType: 'Blood',
        reportingTime: '4 hours',
        instructions: 'No special preparation required'
      },
      {
        testCode: 'ESR001',
        testName: 'Erythrocyte Sedimentation Rate',
        category: createdCategories[0]._id,
        description: 'Measures inflammation in the body',
        price: 300,
        normalRange: 'Men: 0-15 mm/hr, Women: 0-20 mm/hr',
        sampleType: 'Blood',
        reportingTime: '2 hours',
        instructions: 'No fasting required'
      },
      // Clinical Chemistry tests
      {
        testCode: 'GLU001',
        testName: 'Blood Glucose (Fasting)',
        category: createdCategories[1]._id,
        description: 'Measures blood sugar levels after fasting',
        price: 150,
        normalRange: '70-100 mg/dL',
        sampleType: 'Blood',
        reportingTime: '2 hours',
        instructions: 'Fasting required for 8-12 hours'
      },
      {
        testCode: 'LIP001',
        testName: 'Lipid Profile',
        category: createdCategories[1]._id,
        description: 'Measures cholesterol and triglyceride levels',
        price: 800,
        normalRange: 'Total Cholesterol: <200 mg/dL, LDL: <100 mg/dL',
        sampleType: 'Blood',
        reportingTime: '4 hours',
        instructions: 'Fasting required for 9-12 hours'
      },
      {
        testCode: 'LFT001',
        testName: 'Liver Function Test',
        category: createdCategories[1]._id,
        description: 'Comprehensive liver function assessment',
        price: 1200,
        normalRange: 'ALT: 7-56 U/L, AST: 10-40 U/L, Bilirubin: 0.3-1.2 mg/dL',
        sampleType: 'Blood',
        reportingTime: '6 hours',
        instructions: 'No special preparation required'
      },
      // Microbiology tests
      {
        testCode: 'UC001',
        testName: 'Urine Culture',
        category: createdCategories[2]._id,
        description: 'Test for urinary tract infections',
        price: 600,
        normalRange: 'No growth of pathogenic organisms',
        sampleType: 'Urine',
        reportingTime: '48 hours',
        instructions: 'Clean catch midstream urine sample required'
      },
      {
        testCode: 'BC001',
        testName: 'Blood Culture',
        category: createdCategories[2]._id,
        description: 'Test for blood infections',
        price: 1500,
        normalRange: 'No growth of pathogenic organisms',
        sampleType: 'Blood',
        reportingTime: '72 hours',
        instructions: 'Collected before antibiotic administration'
      },
      // Immunology tests
      {
        testCode: 'HBV001',
        testName: 'Hepatitis B Surface Antigen',
        category: createdCategories[3]._id,
        description: 'Test for Hepatitis B infection',
        price: 400,
        normalRange: 'Non-reactive',
        sampleType: 'Blood',
        reportingTime: '24 hours',
        instructions: 'No special preparation required'
      },
      {
        testCode: 'HIV001',
        testName: 'HIV Antibody Test',
        category: createdCategories[3]._id,
        description: 'Test for HIV infection',
        price: 500,
        normalRange: 'Non-reactive',
        sampleType: 'Blood',
        reportingTime: '24 hours',
        instructions: 'Confidential testing available'
      },
      // Endocrinology tests
      {
        testCode: 'TSH001',
        testName: 'Thyroid Stimulating Hormone',
        category: createdCategories[4]._id,
        description: 'Test for thyroid function',
        price: 350,
        normalRange: '0.4-4.0 mIU/L',
        sampleType: 'Blood',
        reportingTime: '24 hours',
        instructions: 'No special preparation required'
      }
    ];

    await LabTest.insertMany(demoTests);

    return NextResponse.json({ 
      message: 'Demo data created successfully',
      data: {
        users: demoUsers.map(user => ({ email: user.email, role: user.role })),
        categories: demoCategories.length,
        tests: demoTests.length
      }
    });
  } catch (error: unknown) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create demo users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}