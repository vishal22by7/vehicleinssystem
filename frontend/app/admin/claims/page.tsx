'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { adminAPI, claimAPI } from '@/lib/api';

interface Claim {
  id?: string;
  _id?: string;
  user?: {
    name: string;
    email: string;
  };
  userId?: {
    name: string;
    email: string;
  };
  policy?: {
    vehicleBrand: string;
    vehicleModel: string;
    policyTypeRef?: {
      name: string;
    };
  };
  policyId?: {
    vehicleBrand: string;
    vehicleModel: string;
    policyTypeId?: {
      name: string;
    };
  };
  description: string;
  status: string;
  photos: Array<{ url: string }>;
  submittedAt: string;
  mlSeverity?: number;
  payoutAmount?: number;
  payoutStatus?: string;
  autoDecision?: boolean;
  autoDecisionReason?: string;
  autoDecisionAt?: string;
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const res = await adminAPI.getClaims();
      if (res.data.success) {
        // Normalize data to ensure both 'id' and '_id' are available
        const normalizedClaims = res.data.claims.map((claim: any) => ({
          ...claim,
          id: claim.id || claim._id,
          _id: claim._id || claim.id
        }));
        setClaims(normalizedClaims);
      }
    } catch (error) {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (claimId: string, newStatus: string) => {
    setUpdating(claimId);
    try {
      const res = await adminAPI.updateClaimStatus(claimId, newStatus);
      if (res.data.success) {
        toast.success(`Claim status updated to ${newStatus}`);
        fetchClaims();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update claim status');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (claimId: string) => {
    if (!claimId) {
      toast.error('Invalid claim ID');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      await claimAPI.delete(claimId);
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

  const getNextStatus = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      'Submitted': ['In Review'],
      'In Review': ['Approved', 'Rejected'],
      'Approved': [],
      'Rejected': []
    };
    return transitions[currentStatus] || [];
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">View Claims</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Review and manage all insurance claims</p>
        </div>

        {claims.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No claims found in the system yet.</p>
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
                      Policy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Payout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Photos
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
                    const nextStatuses = getNextStatus(claim.status);
                    return (
                      <tr key={claimId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {claim.user?.name || claim.userId?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {claim.user?.email || claim.userId?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {(claim.policy || claim.policyId)?.vehicleBrand} {(claim.policy || claim.policyId)?.vehicleModel}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {claim.policy?.policyTypeRef?.name || claim.policyId?.policyTypeId?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                            {claim.description}
                          </div>
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
                          {claim.photos && claim.photos.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {claim.photos.map((photo, idx) => (
                                <a
                                  key={idx}
                                  href={photo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                                >
                                  Photo {idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No photos</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(claim.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            {nextStatuses.length > 0 && (
                              <>
                                {nextStatuses.map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusUpdate(claimId || '', status)}
                                    disabled={updating === claimId}
                                    className={`px-3 py-1 rounded text-xs font-medium ${
                                      status === 'Approved'
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                    } disabled:opacity-50`}
                                  >
                                    {updating === claimId ? 'Updating...' : `Mark as ${status}`}
                                  </button>
                                ))}
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(claimId || '')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
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

