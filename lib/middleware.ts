import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

interface SessionUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  isActive: boolean;
}

interface AuthResult {
  session: { user: SessionUser };
  user: SessionUser;
}

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

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  // Mongoose validation errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
    const mongooseError = error as { errors: Record<string, { message: string }> };
    const messages = Object.values(mongooseError.errors).map((err) => err.message);
    return NextResponse.json({
      error: 'Validation failed',
      details: messages
    }, { status: 400 });
  }
  
  // Mongoose cast errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
    return NextResponse.json({
      error: 'Invalid ID format'
    }, { status: 400 });
  }
  
  // Duplicate key error
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    const field = 'keyValue' in error && error.keyValue ? Object.keys(error.keyValue as Record<string, unknown>)[0] : 'Field';
    return NextResponse.json({
      error: `${field} already exists`
    }, { status: 409 });
  }
  
  // Custom API errors
  if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode) {
    const message = 'message' in error ? String(error.message) : 'Unknown error';
    const code = 'code' in error ? error.code : undefined;
    const response: { error: string; code?: string } = { error: message };
    if (code && typeof code === 'string') {
      response.code = code;
    }
    return NextResponse.json(response, { status: Number(error.statusCode) });
  }
  
  // Default error
  return NextResponse.json({
    error: 'Internal server error'
  }, { status: 500 });
}

export async function requireAuth(request: NextRequest, requiredRoles?: string[]): Promise<AuthResult | NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    
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
    
    return { session: { user }, user };
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T | never {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => 
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
  handler: (request: NextRequest, context: Record<string, unknown>, auth: AuthResult) => Promise<NextResponse>,
  requiredRoles?: string[]
) {
  return async (request: NextRequest, context: Record<string, unknown>) => {
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
  handler: (request: NextRequest, context: Record<string, unknown>) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: Record<string, unknown>) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}