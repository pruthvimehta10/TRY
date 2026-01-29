/**
 * Client-side JWT utilities
 * WARNING: These are for UI purposes only
 * Backend MUST always verify the JWT for security
 */

import { AuthPayload, decodeToken } from './auth';

/**
 * Get JWT from various sources on client-side
 */
export function getJWTFromClient(): string | null {
  // Try localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) return token;

  // Try sessionStorage
  const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  if (sessionToken) return sessionToken;

  // In Next.js, the cookie might be set but we can't access it from client
  // The API will extract it automatically
  return null;
}

/**
 * Get user role from JWT (client-side)
 * For UI routing and conditional rendering only
 * Backend verifies actual access
 */
export function getUserRoleFromJWT(): 'admin' | 'client' | null {
  const token = getJWTFromClient();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  if (payload.role === 'admin' || payload.role === 'client') {
    return payload.role;
  }

  return null;
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  const token = getJWTFromClient();
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload) return false;

  // Check if token is expired
  if (payload.exp && payload.exp < Date.now() / 1000) {
    return false;
  }

  return true;
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return getUserRoleFromJWT() === 'admin';
}

/**
 * Get user ID from JWT
 */
export function getUserIdFromJWT(): string | null {
  const token = getJWTFromClient();
  if (!token) return null;

  const payload = decodeToken(token);
  return payload?.sub || null;
}

/**
 * Get full payload from JWT
 */
export function getJWTPayload(): AuthPayload | null {
  const token = getJWTFromClient();
  if (!token) return null;

  return decodeToken(token);
}

/**
 * Clear token from storage
 */
export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }
}
