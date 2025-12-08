'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { policyAPI, claimAPI } from '@/lib/api';

interface Policy {
  id?: string;  // Sequelize uses 'id'
  _id?: string; // Fallback for compatibility
  vehicleBrand: string;
  vehicleModel: string;
  registrationNumber: string;
  modelYear: number;
  endDate?: string;
  policyTypeId?: {
    name: string;
  };
  policyTypeRef?: {
    name: string;
  };
}

export default function SubmitClaimPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<'idle' | 'uploading' | 'analyzing' | 'deciding' | 'complete'>('idle');
  const [mlResults, setMlResults] = useState<{
    severity?: number;
    confidence?: number;
    damageParts?: string[];
    status?: string;
    decision?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    policyId: '',
    description: '',
    incidentDate: '',
    incidentLocation: ''
  });
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await policyAPI.getAll();
      if (res.data.success) {
        // Normalize data to ensure both 'id' and '_id' are available
        const normalizedPolicies = res.data.policies.map((p: any) => ({
          ...p,
          id: p.id || p._id,
          _id: p._id || p.id,
          policyTypeId: p.policyTypeId || p.policyTypeRef || { name: 'N/A' }
        }));
        
        // Filter only active policies
        const activePolicies = normalizedPolicies.filter((p: Policy) => {
          const endDate = new Date(p.endDate || '');
          return endDate >= new Date();
        });
        setPolicies(activePolicies);
      }
    } catch (error) {
      toast.error('Failed to load policies');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmissionStage('uploading');
    setMlResults(null);

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You are not logged in. Please log in again.');
        router.push('/login');
        return;
      }

      // Validate policyId is a valid UUID
      if (!formData.policyId || formData.policyId.trim() === '') {
        toast.error('Please select a policy');
        setLoading(false);
        setSubmissionStage('idle');
        return;
      }
      
      // Check if policyId looks like a UUID (basic validation)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(formData.policyId)) {
        toast.error('Invalid policy selected. Please select a policy again.');
        console.error('Invalid policyId format:', formData.policyId);
        setLoading(false);
        setSubmissionStage('idle');
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('policyId', formData.policyId.trim());
      formDataToSend.append('description', formData.description);
      formDataToSend.append('incidentDate', formData.incidentDate);
      formDataToSend.append('incidentLocation', formData.incidentLocation);

      photos.forEach((photo, index) => {
        formDataToSend.append(`photos`, photo);
      });

      // Simulate stages for better UX
      setSubmissionStage('uploading');
      await new Promise(resolve => setTimeout(resolve, 500));

      setSubmissionStage('analyzing');
      const res = await claimAPI.submit(formDataToSend);
      
      if (res.data.success) {
        setSubmissionStage('deciding');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Extract ML results from response
        if (res.data.mlAnalysis) {
          setMlResults({
            severity: res.data.mlAnalysis.severity,
            confidence: res.data.mlAnalysis.confidence,
            damageParts: res.data.mlAnalysis.damageParts || [],
            status: res.data.claim?.status || 'Submitted',
            decision: res.data.automation?.decision
          });
        }
        
        setSubmissionStage('complete');
        
        // Show success message with results
        const statusMessage = res.data.automation?.decision 
          ? `Claim ${res.data.automation.decision.toLowerCase()} automatically!` 
          : 'Claim submitted successfully!';
        toast.success(statusMessage);
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          router.push('/claims');
        }, 3000);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit claim';
      toast.error(errorMessage);
      setSubmissionStage('idle');
      setLoading(false);
      
      // If token error, redirect to login
      if (errorMessage.includes('token') || errorMessage.includes('authentication') || error.response?.status === 401) {
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Submit Insurance Claim</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">File a claim for your insured vehicle</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="policyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Policy *
              </label>
              <select
                id="policyId"
                name="policyId"
                value={formData.policyId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a policy</option>
                {policies.map((policy) => {
                  const policyId = policy.id || policy._id;
                  const policyTypeName = policy.policyTypeId?.name || policy.policyTypeRef?.name || 'N/A';
                  return (
                    <option key={policyId} value={policyId}>
                      {policyTypeName} - {policy.vehicleBrand} {policy.vehicleModel} ({policy.registrationNumber})
                    </option>
                  );
                })}
              </select>
              {policies.length === 0 && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  No active policies found. Please purchase a policy first.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="incidentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Incident Date *
              </label>
              <input
                type="date"
                id="incidentDate"
                name="incidentDate"
                value={formData.incidentDate}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="incidentLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Incident Location *
              </label>
              <input
                type="text"
                id="incidentLocation"
                name="incidentLocation"
                value={formData.incidentLocation}
                onChange={handleChange}
                required
                placeholder="Enter location where incident occurred"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={6}
                placeholder="Describe the incident in detail..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Photos * (JPG, PNG, max 5MB each)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handlePhotoChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Upload multiple photos showing the damage from different angles
              </p>

              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Please ensure all photos are clear and show the damage clearly. 
                The ML analyzer will automatically assess the severity of the damage.
              </p>
            </div>

            {/* Loading/Results Section */}
            {submissionStage !== 'idle' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                {submissionStage === 'uploading' && (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Uploading photos...</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Please wait while we upload your claim photos</p>
                    </div>
                  </div>
                )}
                
                {submissionStage === 'analyzing' && (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Analyzing damage with AI...</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Our ML model is assessing the severity of the damage</p>
                    </div>
                  </div>
                )}
                
                {submissionStage === 'deciding' && (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-200">Processing claim decision...</p>
                      <p className="text-xs text-green-700 dark:text-green-300">Determining approval status based on analysis</p>
                    </div>
                  </div>
                )}
                
                {submissionStage === 'complete' && mlResults && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-200">Analysis Complete!</p>
                        <p className="text-xs text-green-700 dark:text-green-300">Your claim has been processed</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Damage Severity</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {mlResults.severity?.toFixed(1) || 'N/A'}/100
                        </p>
                        {mlResults.severity && (
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                mlResults.severity >= 60
                                  ? 'bg-red-500'
                                  : mlResults.severity >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${mlResults.severity}%` }}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ML Confidence</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {mlResults.confidence ? `${(mlResults.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {mlResults.damageParts && mlResults.damageParts.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Affected Parts</p>
                        <div className="flex flex-wrap gap-2">
                          {mlResults.damageParts.map((part, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                            >
                              {part}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Claim Status</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {mlResults.status || 'Submitted'}
                        {mlResults.decision && (
                          <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                            (Auto-{mlResults.decision})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Redirecting to claims page in 3 seconds...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.policyId || photos.length === 0 || submissionStage === 'complete'}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  submissionStage === 'uploading' ? 'Uploading...' :
                  submissionStage === 'analyzing' ? 'Analyzing...' :
                  submissionStage === 'deciding' ? 'Processing...' :
                  'Submitting...'
                ) : 'Submit Claim'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}

