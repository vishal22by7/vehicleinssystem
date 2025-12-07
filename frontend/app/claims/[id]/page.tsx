'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { claimAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Claim {
  id?: string;
  _id?: string;
  description: string;
  status: string;
  submittedAt: string;
  mlSeverity?: number;
  mlConfidence?: number;
  damageParts?: string[];
  mlValidationError?: string;
  policy?: {
    id?: string;
    _id?: string;
    vehicleBrand: string;
    vehicleModel: string;
    registrationNumber: string;
    policyTypeRef?: {
      name: string;
    };
  };
  photos?: Array<{
    id?: string;
    _id?: string;
    url: string;
    ipfsCid?: string;
  }>;
  user?: {
    name: string;
    email: string;
  };
}

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const claimId = params?.id as string;
    if (claimId) {
      fetchClaimDetails(claimId);
    }
  }, [params]);

  const fetchClaimDetails = async (id: string) => {
    try {
      setLoading(true);
      const res = await claimAPI.getById(id);
      if (res.data.success) {
        // Normalize claim data
        const claimData = res.data.claim;
        setClaim({
          ...claimData,
          id: claimData.id || claimData._id,
          _id: claimData._id || claimData.id,
          policy: claimData.policy ? {
            ...claimData.policy,
            id: claimData.policy.id || claimData.policy._id,
            _id: claimData.policy._id || claimData.policy.id
          } : undefined
        });
      } else {
        toast.error(res.data.message || 'Failed to load claim details');
        router.push('/claims');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Claim not found');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load claim details');
      }
      router.push('/claims');
    } finally {
      setLoading(false);
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

  const getSeverityColor = (severity?: number) => {
    if (!severity) return 'bg-gray-500';
    if (severity >= 60) return 'bg-red-500';
    if (severity >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
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

  if (!claim) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">
          Claim not found.
        </div>
      </ProtectedRoute>
    );
  }

  const claimId = claim.id || claim._id;

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Claims
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Claim Details</h1>
        </div>

        {/* Claim Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Claim ID</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{claimId}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(claim.status)}`}>
              {claim.status}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Submitted Date</p>
              <p className="text-gray-900 dark:text-white">
                {new Date(claim.submittedAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {claim.mlSeverity !== null && claim.mlSeverity !== undefined && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Damage Severity</p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {claim.mlSeverity.toFixed(1)}/100
                  </p>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-xs">
                    <div
                      className={`h-full ${getSeverityColor(claim.mlSeverity)}`}
                      style={{ width: `${claim.mlSeverity}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Information */}
        {claim.policy && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vehicle Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {claim.policy.vehicleBrand} {claim.policy.vehicleModel}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Registration Number</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {claim.policy.registrationNumber}
                </p>
              </div>
              {claim.policy.policyTypeRef && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Policy Type</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {claim.policy.policyTypeRef.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Claim Description</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {claim.description}
          </p>
        </div>

        {/* ML Analysis Results */}
        {(claim.mlSeverity !== null && claim.mlSeverity !== undefined) || claim.mlValidationError ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ML Analysis Results</h3>
            {claim.mlValidationError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 font-medium">Validation Error</p>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">{claim.mlValidationError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Severity Score</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {claim.mlSeverity?.toFixed(1)}/100
                    </p>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full ${getSeverityColor(claim.mlSeverity)}`}
                        style={{ width: `${claim.mlSeverity || 0}%` }}
                      />
                    </div>
                  </div>
                  {claim.mlConfidence !== null && claim.mlConfidence !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(claim.mlConfidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                {claim.damageParts && claim.damageParts.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Affected Parts</p>
                    <div className="flex flex-wrap gap-2">
                      {claim.damageParts.map((part, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                        >
                          {part}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ML Analysis</h3>
            <p className="text-gray-500 dark:text-gray-400">Analysis pending or not available</p>
          </div>
        )}

        {/* Photos */}
        {claim.photos && claim.photos.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Claim Photos ({claim.photos.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {claim.photos.map((photo, index) => {
                const photoUrl = photo.url.startsWith('http') 
                  ? photo.url 
                  : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${photo.url}`;
                return (
                  <div key={photo.id || photo._id || index} className="relative group">
                    <img
                      src={photoUrl}
                      alt={`Claim photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(photoUrl, '_blank')}
                    />
                    {photo.ipfsCid && (
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        IPFS: {String(photo.ipfsCid).substring(0, 10)}...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User Information (if admin) */}
        {user?.role === 'admin' && claim.user && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Claimant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white">{claim.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white">{claim.user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

