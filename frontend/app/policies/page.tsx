'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { policyAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Policy {
  _id: string;
  vehicleBrand: string;
  vehicleModel: string;
  registrationNumber: string;
  premium: number;
  startDate: string;
  endDate: string;
  status: string;
  proposalNumber?: string;
  policyTypeId: {
    name: string;
  };
}

export default function PoliciesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Redirect admin users to admin policies page
  useEffect(() => {
    if (user?.role === 'admin') {
      router.push('/admin/policies');
    }
  }, [user, router]);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await policyAPI.getAll();
      if (res.data.success) {
        setPolicies(res.data.policies);
      }
    } catch (error) {
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return;
    }

    try {
      await policyAPI.delete(id);
      toast.success('Policy deleted successfully');
      fetchPolicies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete policy');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  const getStatusBadge = (policy: Policy) => {
    const now = new Date();
    const endDate = new Date(policy.endDate);
    const isExpired = endDate < now;
    const isActive = !isExpired && new Date(policy.startDate) <= now;

    if (policy.status === 'Cancelled') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cancelled</span>;
    }
    if (isExpired) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Expired</span>;
    }
    if (isActive) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</span>;
  };

  const filteredPolicies = policies.filter(policy => {
    if (filter === 'active') {
      const endDate = new Date(policy.endDate);
      return endDate >= new Date() && policy.status !== 'Cancelled';
    }
    if (filter === 'expired') {
      const endDate = new Date(policy.endDate);
      return endDate < new Date();
    }
    return true;
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Policies</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your vehicle insurance policies</p>
          </div>
          <Link
            href="/buy-policy"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Buy New Policy
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFilter('all')}
            className={`pb-4 px-4 font-medium transition-colors ${
              filter === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All ({policies.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`pb-4 px-4 font-medium transition-colors ${
              filter === 'active'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Active ({policies.filter(p => {
              const endDate = new Date(p.endDate);
              return endDate >= new Date() && p.status !== 'Cancelled';
            }).length})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`pb-4 px-4 font-medium transition-colors ${
              filter === 'expired'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Expired ({policies.filter(p => new Date(p.endDate) < new Date()).length})
          </button>
        </div>

        {filteredPolicies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No policies found</p>
            <Link
              href="/buy-policy"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              Buy your first policy →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolicies.map((policy) => {
              const endDate = new Date(policy.endDate);
              const isExpired = endDate < new Date();
              const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={policy._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {policy.vehicleBrand} {policy.vehicleModel}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {policy.registrationNumber}
                      </p>
                    </div>
                    {getStatusBadge(policy)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Policy Type:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {policy.policyTypeId?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Premium:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(policy.premium)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Valid Until:</span>
                      <span className="text-gray-900 dark:text-white">
                        {endDate.toLocaleDateString()}
                      </span>
                    </div>
                    {!isExpired && daysRemaining > 0 && daysRemaining <= 30 && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ Renewal due in {daysRemaining} days
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Link
                      href={`/policies/${policy._id}`}
                      className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      View Details
                    </Link>
                    {!isExpired && (
                      <button
                        onClick={() => handleDelete(policy._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

