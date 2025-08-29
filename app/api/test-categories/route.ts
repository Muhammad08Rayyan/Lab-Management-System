import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestCategory from '@/lib/models/TestCategory';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    const skip = (page - 1) * limit;

    await connectDB();

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const categories = await TestCategory.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    const total = await TestCategory.countDocuments(query);

    return NextResponse.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching categories:', error);
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
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: 'Category name is required' 
      }, { status: 400 });
    }

    await connectDB();

    // Check if category with this name already exists
    const existingCategory = await TestCategory.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    
    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }

    const category = new TestCategory({
      name: name.trim(),
      description: description?.trim() || ''
    });

    await category.save();

    return NextResponse.json({ 
      message: 'Category created successfully', 
      category 
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}