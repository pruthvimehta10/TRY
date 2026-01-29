import { NextRequest, NextResponse } from 'next/server';
import { extractJWT, verifyToken, hasRole, AuthPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthPayload;
}

/**
 * Middleware to verify JWT and attach user to request
 * Returns 401 if no token, 403 if invalid/expired
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>,
) {
  return async (req: AuthenticatedRequest) => {
    try {
      const token = extractJWT(req);

      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized: Missing authentication token' },
          { status: 401 },
        );
      }

      const user = await verifyToken(token);
      req.user = user;

      return await handler(req);
    } catch (error: any) {
      return NextResponse.json(
        { error: `Forbidden: ${error.message}` },
        { status: 403 },
      );
    }
  };
}

/**
 * Middleware to check if user has required role(s)
 * Returns 403 if role not allowed
 */
export function withRole(...requiredRoles: string[]) {
  return (handler: (req: AuthenticatedRequest) => Promise<Response>) => {
    return async (req: AuthenticatedRequest) => {
      if (!req.user) {
        return NextResponse.json(
          { error: 'Unauthorized: User not authenticated' },
          { status: 401 },
        );
      }

      if (!hasRole(req.user.role, requiredRoles)) {
        return NextResponse.json(
          {
            error: `Forbidden: Insufficient permissions. Required role(s): ${requiredRoles.join(', ')}`,
          },
          { status: 403 },
        );
      }

      return await handler(req);
    };
  };
}

/**
 * Compose authentication and authorization middleware
 * Usage: withAuthFlow('admin', handler)
 */
export function withAuthFlow(
  requiredRole: string | string[],
  handler: (req: AuthenticatedRequest) => Promise<Response>,
) {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return withAuth(withRole(...roles)(handler));
}
