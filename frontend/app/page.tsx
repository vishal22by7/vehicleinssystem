'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    // Add timeout fallback - if loading takes too long, redirect to login
    const timeoutId = setTimeout(() => {
      if (loading && !redirected) {
        router.push('/login');
        setRedirected(true);
      }
    }, 5000); // 5 second timeout

    if (!loading && !redirected) {
      if (isAuthenticated) {
        // Redirect based on user role
        if (user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
      setRedirected(true);
    }

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, loading, router, redirected]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
