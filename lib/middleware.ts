import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export interface ApiError extends Error {
  statusCode: number;
  code?: string;
}

export function createApiError(message: string, statusCode: number, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function handleApiError(error: any): NextResponse {
  console.error('API Error:', error);
  
  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err: any) => err.message);
    return NextResponse.json({
      error: 'Validation failed',
      details: messages
    }, { status: 400 });
  }
  
  // Mongoose cast errors
  if (error.name === 'CastError') {
    return NextResponse.json({
      error: 'Invalid ID format'
    }, { status: 400 });
  }
  
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return NextResponse.json({
      error: `${field} already exists`
    }, { status: 409 });
  }
  
  // Custom API errors
  if (error.statusCode) {
    return NextResponse.json({
      error: error.message,
      ...(error.code && { code: error.code })
    }, { status: error.statusCode });
  }
  
  // Default error
  return NextResponse.json({
    error: 'Internal server error'
  }, { status: 500 });
}

export async function requireAuth(request: NextRequest, requiredRoles?: string[]): Promise<{ session: any; user: any } | NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user as any;
    
    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }
    
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        return NextResponse.json({ 
          error: 'Insufficient permissions',
          required: requiredRoles,
          current: user.role
        }, { status: 403 });
      }
    }
    
    return { session, user };
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: any): T | never {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      throw createApiError(
        `Validation failed: ${errorMessages.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    throw error;
  }
}

export function requireMethod(request: NextRequest, allowedMethods: string[]): void | never {
  if (!allowedMethods.includes(request.method)) {
    throw createApiError(
      `Method ${request.method} not allowed`,
      405,
      'METHOD_NOT_ALLOWED'
    );
  }
}

export async function parseRequestBody<T>(request: NextRequest, schema?: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    
    if (schema) {
      return validateRequest(schema, body);
    }
    
    return body;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createApiError('Invalid JSON format', 400, 'INVALID_JSON');
    }
    throw error;
  }
}

export function parseSearchParams(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))),
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') === 'asc' ? 1 : -1,
    ...Object.fromEntries(searchParams.entries())
  };
}

export function createPaginationResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
}

// Request wrapper that handles common patterns
export function withAuth(
  handler: (request: NextRequest, context: any, auth: { session: any; user: any }) => Promise<NextResponse>,
  requiredRoles?: string[]
) {
  return async (request: NextRequest, context: any) => {
    try {
      const authResult = await requireAuth(request, requiredRoles);
      
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      
      return await handler(request, context, authResult);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function withErrorHandling(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}