'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { policyAPI, claimAPI } from '@/lib/api';

interface Policy {
  _id: string;
  vehicleBrand: string;
  vehicleModel: string;
  registrationNumber: string;
  modelYear: number;
  policyTypeId: {
    name: string;
  };
}

export default function SubmitClaimPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
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
        // Filter only active policies
        const activePolicies = res.data.policies.filter((p: Policy) => {
          const endDate = new Date(p.endDate || p['endDate']);
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

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('policyId', formData.policyId);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('incidentDate', formData.incidentDate);
      formDataToSend.append('incidentLocation', formData.incidentLocation);

      photos.forEach((photo, index) => {
        formDataToSend.append(`photos`, photo);
      });

      const res = await claimAPI.submit(formDataToSend);
      if (res.data.success) {
        toast.success('Claim submitted successfully!');
        router.push('/claims');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
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
                {policies.map((policy) => (
                  <option key={policy._id} value={policy._id}>
                    {policy.policyTypeId?.name || 'N/A'} - {policy.vehicleBrand} {policy.vehicleModel} ({policy.registrationNumber})
                  </option>
                ))}
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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.policyId || photos.length === 0}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}

