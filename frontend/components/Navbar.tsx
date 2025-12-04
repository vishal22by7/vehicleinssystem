'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profile-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link 
            href={isAuthenticated && user?.role === 'admin' ? '/admin' : isAuthenticated ? '/dashboard' : '/'} 
            className="text-2xl font-bold hover:text-blue-200 transition-colors"
          >
            🚗 VIMS
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-blue-500 transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          
          {isAuthenticated && (
            <>
              <div className="hidden md:flex items-center gap-4">
                {user?.role === 'admin' ? (
                  <>
                    <Link href="/admin" className="hover:text-blue-200 transition-colors">Dashboard</Link>
                    <Link href="/admin/policy-types" className="hover:text-blue-200 transition-colors">Policy Types</Link>
                    <Link href="/admin/users" className="hover:text-blue-200 transition-colors">Users</Link>
                    <Link href="/admin/policies" className="hover:text-blue-200 transition-colors">Policies</Link>
                    <Link href="/admin/claims" className="hover:text-blue-200 transition-colors">Claims</Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard" className="hover:text-blue-200 transition-colors">Dashboard</Link>
                    <Link href="/calculator" className="hover:text-blue-200 transition-colors">Calculator</Link>
                    <Link href="/buy-policy" className="hover:text-blue-200 transition-colors">Buy Policy</Link>
                    <Link href="/policies" className="hover:text-blue-200 transition-colors">My Policies</Link>
                    <Link href="/submit-claim" className="hover:text-blue-200 transition-colors">Submit Claim</Link>
                    <Link href="/claims" className="hover:text-blue-200 transition-colors">My Claims</Link>
                  </>
                )}
              </div>
              
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center font-bold text-white transition-colors"
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{user?.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        👤 My Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
}

