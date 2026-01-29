import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.EXTERNAL_JWT_SECRET || 'test-secret-key-change-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload {
  sub: string;
  role: 'admin' | 'client';
  exp: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Extract JWT from Authorization header or cookies
 */
export function extractJWT(request: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try HTTP-only cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    const tokenCookie = cookies.find((c) => c.trim().startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
  }

  return null;
}

/**
 * Verify and decode JWT
 * Throws error if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<AuthPayload> {
  try {
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as AuthPayload;

    // Ensure required fields exist
    if (!payload.sub || !payload.role) {
      throw new Error('Invalid token: missing required fields');
    }

    if (!['admin', 'client'].includes(payload.role)) {
      throw new Error('Invalid token: invalid role');
    }

    return payload;
  } catch (error: any) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Decode JWT without verification (for client-side use)
 * WARNING: Only use for UI purposes, backend must verify
 */
export function decodeToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, requiredRole: string | string[]): boolean {
  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return required.includes(userRole);
}
