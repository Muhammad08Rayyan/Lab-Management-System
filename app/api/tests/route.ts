import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';
import TestCategory from '@/lib/models/TestCategory';

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
    const categoryId = searchParams.get('category');
    const isActive = searchParams.get('isActive');
    const skip = (page - 1) * limit;

    await connectDB();

    let query: any = {};

    if (search) {
      query.$or = [
        { testCode: { $regex: search, $options: 'i' } },
        { testName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (categoryId) {
      query.category = categoryId;
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const tests = await LabTest.find(query)
      .populate('category', 'name description')
      .skip(skip)
      .limit(limit)
      .sort({ testName: 1 });

    const total = await LabTest.countDocuments(query);

    return NextResponse.json({
      tests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching tests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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
      instructions
    } = body;

    if (!testCode || !testName || !category || !price || !sampleType || !reportingTime) {
      return NextResponse.json({ 
        error: 'Missing required fields: testCode, testName, category, price, sampleType, reportingTime' 
      }, { status: 400 });
    }

    await connectDB();

    // Verify category exists
    const categoryExists = await TestCategory.findById(category);
    if (!categoryExists) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    // Check if test code already exists
    const existingTest = await LabTest.findOne({ testCode: testCode.toUpperCase() });
    if (existingTest) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }

    const test = new LabTest({
      testCode: testCode.toUpperCase(),
      testName,
      category,
      description,
      price,
      normalRange,
      sampleType,
      reportingTime,
      instructions
    });

    await test.save();
    await test.populate('category', 'name description');

    return NextResponse.json({ 
      message: 'Test created successfully', 
      test 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating test:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}