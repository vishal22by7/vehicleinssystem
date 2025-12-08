'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { policyAPI } from '@/lib/api';

interface Policy {
  id?: string;
  _id?: string;
  vehicleBrand: string;
  vehicleModel: string;
  variant?: string;
  registrationNumber: string;
  premium: number;
  premiumBreakdown?: any;
  idv?: number;
  ncbPercentage?: number;
  startDate: string;
  endDate: string;
  status: string;
  proposalNumber?: string;
  policyType?: string;
  vehicleCategory?: string;
  usageType?: string;
  coverType?: string;
  vehicleType?: string;
  fuelType?: string;
  modelYear?: number;
  yearOfRegistration?: number;
  engineCapacity?: number;
  seatingCapacity?: number;
  registrationDate?: string;
  rtoState?: string;
  rtoCity?: string;
  chassisNumber?: string;
  engineNumber?: string;
  isFinanced?: boolean;
  financierName?: string;
  previousPolicy?: any;
  ownerDetails?: any;
  nominee?: any;
  addOns?: string[];
  documents?: any;
  declarations?: any;
  policyTypeId?: {
    name: string;
    description?: string;
  };
  policyTypeRef?: {
    name: string;
    description?: string;
  };
  blockchainTxHash?: string;
  ipfsCid?: string;
}

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const policyId = params?.id as string;
    if (policyId) {
      fetchPolicy(policyId);
    }
  }, [params]);

  const fetchPolicy = async (id: string) => {
    try {
      setLoading(true);
      const res = await policyAPI.getById(id);
      if (res.data.success) {
        const policyData = res.data.policy;
        // Normalize ID
        setPolicy({
          ...policyData,
          id: policyData.id || policyData._id,
          _id: policyData._id || policyData.id,
          policyTypeId: policyData.policyTypeId || policyData.policyTypeRef
        });
      } else {
        toast.error('Policy not found');
        router.push('/policies');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Policy not found');
      } else {
        toast.error('Failed to load policy details');
      }
      router.push('/policies');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (!policy) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">Policy not found</p>
            <Link
              href="/policies"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              ← Back to Policies
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const policyTypeName = policy.policyTypeId?.name || policy.policyTypeRef?.name || policy.policyType || 'N/A';
  const isExpired = new Date(policy.endDate) < new Date();
  const isActive = !isExpired && new Date(policy.startDate) <= new Date();

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Link
            href="/policies"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium mb-4 inline-block"
          >
            ← Back to Policies
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Policy Details</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {policy.vehicleBrand} {policy.vehicleModel}
                {policy.variant && ` ${policy.variant}`}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Registration: {policy.registrationNumber}
              </p>
              {policy.proposalNumber && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Proposal #: {policy.proposalNumber}
                </p>
              )}
            </div>
            <div className="text-right">
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : isExpired
                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}
              >
                {policy.status}
              </span>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {formatCurrency(policy.premium)}
              </p>
            </div>
          </div>

          {/* Policy Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Policy Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Policy Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policyTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Vehicle Category:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policy.vehicleCategory || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Usage Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policy.usageType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cover Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policy.coverType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(policy.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(policy.endDate)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vehicle Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Make:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policy.vehicleBrand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Model:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policy.vehicleModel}</span>
                </div>
                {policy.variant && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Variant:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{policy.variant}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Fuel Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policy.fuelType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Engine Capacity:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {policy.engineCapacity ? `${policy.engineCapacity} CC` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Model Year:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{policy.modelYear || policy.yearOfRegistration || 'N/A'}</span>
                </div>
                {policy.chassisNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Chassis Number:</span>
                    <span className="font-medium text-gray-900 dark:text-white font-mono text-sm">{policy.chassisNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Premium Breakdown */}
          {policy.premiumBreakdown && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Premium Breakdown</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="space-y-2">
                  {policy.premiumBreakdown.tpPremium > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Third-Party Premium:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(policy.premiumBreakdown.tpPremium)}
                      </span>
                    </div>
                  )}
                  {policy.premiumBreakdown.odPremium > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Own Damage Premium:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(policy.premiumBreakdown.odPremium)}
                      </span>
                    </div>
                  )}
                  {policy.premiumBreakdown.addOnsPremium > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Add-ons Premium:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(policy.premiumBreakdown.addOnsPremium)}
                      </span>
                    </div>
                  )}
                  {policy.premiumBreakdown.ncbDiscount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>NCB Discount ({policy.ncbPercentage || 0}%):</span>
                      <span className="font-medium">-{formatCurrency(policy.premiumBreakdown.ncbDiscount)}</span>
                    </div>
                  )}
                  {policy.premiumBreakdown.gst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">GST (18%):</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(policy.premiumBreakdown.gst)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Premium:</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(policy.premium)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IDV */}
          {policy.idv && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Insured Declared Value (IDV)</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(policy.idv)}</p>
            </div>
          )}

          {/* Add-ons */}
          {policy.addOns && policy.addOns.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add-ons</h3>
              <div className="flex flex-wrap gap-2">
                {policy.addOns.map((addOn, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {addOn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Blockchain Info */}
          {policy.blockchainTxHash && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Blockchain Record</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all">
                TX Hash: {policy.blockchainTxHash}
              </p>
            </div>
          )}

          {/* Documents */}
          {policy.documents && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents</h3>
              <div className="space-y-2">
                {policy.documents.rcDocument && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-700 dark:text-gray-300">RC Document</span>
                    {policy.documents.rcDocument.ipfsCid && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        IPFS: {String(policy.documents.rcDocument.ipfsCid).substring(0, 10)}...
                      </span>
                    )}
                  </div>
                )}
                {policy.documents.salesInvoice && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-700 dark:text-gray-300">Sales Invoice</span>
                    {policy.documents.salesInvoice.ipfsCid && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        IPFS: {String(policy.documents.salesInvoice.ipfsCid).substring(0, 10)}...
                      </span>
                    )}
                  </div>
                )}
                {policy.documents.previousPolicyCopy && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-700 dark:text-gray-300">Previous Policy Copy</span>
                    {policy.documents.previousPolicyCopy.ipfsCid && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        IPFS: {String(policy.documents.previousPolicyCopy.ipfsCid).substring(0, 10)}...
                      </span>
                    )}
                  </div>
                )}
                {policy.documents.puc && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-700 dark:text-gray-300">PUC Certificate</span>
                    {policy.documents.puc.ipfsCid && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        IPFS: {String(policy.documents.puc.ipfsCid).substring(0, 10)}...
                      </span>
                    )}
                  </div>
                )}
                {policy.documents.drivingLicense && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-700 dark:text-gray-300">Driving License</span>
                    {policy.documents.drivingLicense.ipfsCid && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        IPFS: {String(policy.documents.drivingLicense.ipfsCid).substring(0, 10)}...
                      </span>
                    )}
                  </div>
                )}
                {policy.documents.vehiclePhotos && policy.documents.vehiclePhotos.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-700 dark:text-gray-300">Vehicle Photos ({policy.documents.vehiclePhotos.length})</span>
                    {policy.documents.vehiclePhotos.some((photo: any) => photo.ipfsCid) && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {policy.documents.vehiclePhotos.filter((photo: any) => photo.ipfsCid).length} on IPFS
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

