import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';

interface SessionUser {
  id: string;
  role: string;
  email: string;
}

interface TestQuery {
  $or?: Array<{
    code?: { $regex: string; $options: string };
    name?: { $regex: string; $options: string };
  }>;
}

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
    const skip = (page - 1) * limit;

    await connectDB();

    const query: TestQuery = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const tests = await LabTest.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

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
  } catch (error: unknown) {
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

    const userRole = (session.user as SessionUser).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, price } = body;

    if (!code || !name || !price) {
      return NextResponse.json({ 
        error: 'Missing required fields: code, name, price' 
      }, { status: 400 });
    }

    await connectDB();

    // Check if test code already exists
    const existingTest = await LabTest.findOne({ code: code.toUpperCase() });
    if (existingTest) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }

    const test = new LabTest({
      code: code.toUpperCase(),
      name,
      price
    });

    await test.save();

    return NextResponse.json({ 
      message: 'Test created successfully', 
      test 
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating test:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}