'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRoleFromJWT, isAuthenticated } from '@/lib/auth-client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'client' | ('admin' | 'client')[];
  fallback?: React.ReactNode;
}

/**
 * Client-side route protection component
 * Redirects unauthenticated users to login
 * Redirects unauthorized users based on role
 * NOTE: Backend always enforces access - this is for UX only
 */
export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      // Check authentication
      if (!isAuthenticated()) {
        router.push(process.env.NEXT_PUBLIC_LOGIN_URL || '/login');
        return;
      }

      // If no role required, user is authenticated
      if (!requiredRole) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Check role
      const userRole = getUserRoleFromJWT();
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      if (userRole && roles.includes(userRole)) {
        setIsAuthorized(true);
      } else {
        // Redirect to appropriate page based on user's actual role
        if (userRole === 'admin') {
          router.push('/admin');
        } else {
          router.push('/courses');
        }
      }

      setIsLoading(false);
    };

    checkAccess();
  }, [requiredRole, router]);

  if (isLoading) {
    return fallback || <div>Loading...</div>;
  }

  if (!isAuthorized) {
    return fallback || <div>Unauthorized</div>;
  }

  return <>{children}</>;
}
