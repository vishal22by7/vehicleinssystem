'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { claimAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Claim {
  id?: string;  // Sequelize uses 'id'
  _id?: string; // Fallback for compatibility
  description: string;
  status: string;
  submittedAt: string;
  mlSeverity?: number;
  payoutAmount?: number;
  payoutStatus?: string;
  policy?: {  // Backend returns 'policy', not 'policyId'
    vehicleBrand: string;
    vehicleModel: string;
    registrationNumber: string;
  };
  policyId?: {  // Keep for backward compatibility
    vehicleBrand: string;
    vehicleModel: string;
    registrationNumber: string;
  };
}

export default function ClaimsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect admin users to admin claims page
  useEffect(() => {
    if (user?.role === 'admin') {
      router.push('/admin/claims');
    }
  }, [user, router]);

  useEffect(() => {
    fetchClaims();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchClaims, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchClaims = async () => {
    try {
      const res = await claimAPI.getAll();
      if (res.data.success) {
        // Normalize data to ensure both 'id' and '_id' are available
        // Also normalize policy data (backend returns 'policy', frontend may expect 'policyId')
        const normalizedClaims = res.data.claims.map((claim: any) => ({
          ...claim,
          id: claim.id || claim._id,
          _id: claim._id || claim.id,
          // Backend returns 'policy', but we'll also add it as 'policyId' for compatibility
          policyId: claim.policy || claim.policyId,
          policy: claim.policy || claim.policyId
        }));
        setClaims(normalizedClaims);
      }
    } catch (error) {
      console.error('Failed to load claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this claim?')) {
      return;
    }

    try {
      await claimAPI.delete(id);
      toast.success('Claim deleted successfully');
      fetchClaims();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete claim');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'Submitted': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'In Review': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Claims</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage your insurance claims</p>
          </div>
          <Link
            href="/submit-claim"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + File New Claim
          </Link>
        </div>

        {claims.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No claims found</p>
            <Link
              href="/submit-claim"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              File your first claim →
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Severity
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Payout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Submitted
                    </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {claims.map((claim) => {
                  const claimId = claim.id || claim._id;
                  const policy = claim.policy || claim.policyId;
                  return (
                  <tr key={claimId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {policy ? (
                        <>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {policy.vehicleBrand} {policy.vehicleModel}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {policy.registrationNumber}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                        {claim.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {claim.mlSeverity !== null && claim.mlSeverity !== undefined ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {claim.mlSeverity.toFixed(1)}/100
                          </div>
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full ${
                                claim.mlSeverity >= 60
                                  ? 'bg-red-500'
                                  : claim.mlSeverity >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${claim.mlSeverity}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(claim.status)}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {claim.status === 'Approved' && claim.payoutAmount ? (
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          ₹{new Intl.NumberFormat('en-IN').format(claim.payoutAmount)}
                        </div>
                      ) : claim.status === 'Approved' ? (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Calculating...</span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(claim.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/claims/${claimId}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-4"
                      >
                        View
                      </Link>
                      {claim.status === 'Submitted' && (
                        <button
                          onClick={() => handleDelete(claimId || '')}
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

