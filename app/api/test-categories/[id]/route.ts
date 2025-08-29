import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestCategory from '@/lib/models/TestCategory';
import LabTest from '@/lib/models/LabTest';

interface SessionUser {
  id: string;
  role: string;
  email: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const category = await TestCategory.findById(id);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error: unknown) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive } = body;

    await connectDB();

    const category = await TestCategory.findById(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // If updating name, check for duplicates
    if (name && name !== category.name) {
      const existingCategory = await TestCategory.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (existingCategory) {
        return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
      }
    }

    // Update fields
    if (name !== undefined) category.name = name.trim();
    if (description !== undefined) category.description = description?.trim() || '';
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return NextResponse.json({ 
      message: 'Category updated successfully', 
      category 
    });
  } catch (error: unknown) {
    console.error('Error updating category:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const category = await TestCategory.findById(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if any tests are using this category
    const testsUsingCategory = await LabTest.countDocuments({ category: id });
    if (testsUsingCategory > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category. ${testsUsingCategory} test(s) are using this category.` 
      }, { status: 400 });
    }

    await TestCategory.findByIdAndDelete(id);

    return NextResponse.json({ 
      message: 'Category deleted successfully' 
    });
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}