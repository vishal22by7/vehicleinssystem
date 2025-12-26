'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { adminAPI, policyAPI } from '@/lib/api';

interface Policy {
  id?: string;
  _id?: string;
  userId?: {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
  };
  user?: {  // Backend returns 'user' from association
    id?: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
  };
  policyTypeId?: {
    id?: string;
    name: string;
    description?: string;
  };
  policyTypeRef?: {  // Backend returns 'policyTypeRef' from association
    id?: string;
    name: string;
    description?: string;
  };
  vehicleBrand: string;
  vehicleModel: string;
  modelYear: number;
  vehicleType: string;
  engineCapacity: number;
  registrationNumber: string;
  chassisNumber: string;
  premium: number;
  startDate: string;
  endDate: string;
  status: string;
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await adminAPI.getPolicies();
      if (res.data.success) {
        const policies = res.data.policies.map((p: any) => ({
          ...p,
          id: p.id || p._id,
          _id: p._id || p.id,
          userId: p.user || p.userId,
          policyTypeId: p.policyTypeRef || p.policyTypeId
        }));
        setPolicies(policies);
      }
    } catch (error) {
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
      return;
    }

    try {
      await policyAPI.delete(policyId);
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

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">View Policies</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage all insurance policies in the system</p>
        </div>

        {policies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No policies found in the system yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Policy Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Premium
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {policies.map((policy) => {
                    const policyId = policy.id || policy._id;
                    const isActive = new Date(policy.endDate) > new Date();
                    // Get user info (from userId or user field)
                    const user = policy.userId || policy.user;
                    // Get policy type info (from policyTypeId or policyTypeRef field)
                    const policyType = policy.policyTypeId || policy.policyTypeRef;
                    
                    return (
                      <tr key={policyId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user?.email || 'N/A'}
                          </div>
                          {user?.phone && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              📱 {user.phone}
                            </div>
                          )}
                          {user?.role && user.role !== 'user' && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {user.role.toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {policyType?.name || 'N/A'}
                          </div>
                          {policyType?.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
                              {policyType.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {policy.vehicleBrand} {policy.vehicleModel} ({policy.modelYear})
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {policy.vehicleType} - {policy.engineCapacity}L
                          </div>
                          {policy.registrationNumber && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Reg: {policy.registrationNumber} | Chassis: {policy.chassisNumber?.substring(0, 12)}...
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(policy.premium)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(policy.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(policy.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {isActive ? 'Active' : 'Expired'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDelete(policyId || '')}
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

