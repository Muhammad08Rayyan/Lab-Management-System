'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session && session.user.role) {
      // Redirect to role-specific dashboard
      const roleDashboard = getRoleDashboardPath(session.user.role);
      router.push(roleDashboard);
    }
  }, [status, session, router]);

  const getRoleDashboardPath = (role: string) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'lab_tech':
        return '/lab';
      case 'reception':
        return '/reception';
      case 'patient':
        return '/patient';
      default:
        return '/auth/login';
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return null; // Will redirect automatically
}