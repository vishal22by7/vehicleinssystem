'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { calculatorAPI } from '@/lib/api';

export default function CalculatorPage() {
  const [formData, setFormData] = useState({
    vehicleCategory: '4W',
    policyType: 'Comprehensive',
    engineCapacity: '',
    yearOfManufacture: new Date().getFullYear().toString(),
    registrationDate: new Date().toISOString().split('T')[0],
    exShowroomPrice: '',
    previousNCB: '0',
    addOns: [] as string[]
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddOnToggle = (addOnId: string) => {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.includes(addOnId)
        ? prev.addOns.filter(id => id !== addOnId)
        : [...prev.addOns, addOnId]
    }));
  };

  const calculatePremium = async () => {
    if (!formData.engineCapacity || !formData.yearOfManufacture) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await calculatorAPI.calculatePremium({
        vehicleCategory: formData.vehicleCategory,
        policyType: formData.policyType,
        engineCapacity: parseFloat(formData.engineCapacity),
        yearOfManufacture: parseInt(formData.yearOfManufacture),
        registrationDate: formData.registrationDate,
        exShowroomPrice: parseFloat(formData.exShowroomPrice) || 500000,
        previousNCB: parseFloat(formData.previousNCB),
        addOns: formData.addOns
      });

      if (res.data.success) {
        setResult(res.data.calculation);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to calculate premium');
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

  const addOnsList = [
    { id: 'zeroDepreciation', name: 'Zero Depreciation' },
    { id: 'engineProtector', name: 'Engine Protector' },
    { id: 'returnToInvoice', name: 'Return To Invoice' },
    { id: 'ncbProtector', name: 'NCB Protector' },
    { id: 'roadsideAssistance', name: 'Roadside Assistance' },
    { id: 'keyLockCover', name: 'Key & Lock Cover' },
    { id: 'tyreProtection', name: 'Tyre Protection' },
    { id: 'consumablesCover', name: 'Consumables Cover' }
  ];

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Premium Calculator</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Calculate your vehicle insurance premium</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Vehicle Details</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vehicle Category *
                </label>
                <select
                  name="vehicleCategory"
                  value={formData.vehicleCategory}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="2W">Two Wheeler</option>
                  <option value="4W">Four Wheeler</option>
                  <option value="Commercial">Commercial Vehicle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Policy Type *
                </label>
                <select
                  name="policyType"
                  value={formData.policyType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="TP">Third-Party Only</option>
                  <option value="OD">Own Damage Only</option>
                  <option value="Comprehensive">Comprehensive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Engine Capacity (CC) *
                  </label>
                  <input
                    type="number"
                    name="engineCapacity"
                    value={formData.engineCapacity}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Year of Manufacture *
                  </label>
                  <input
                    type="number"
                    name="yearOfManufacture"
                    value={formData.yearOfManufacture}
                    onChange={handleChange}
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ex-Showroom Price (₹)
                </label>
                <input
                  type="number"
                  name="exShowroomPrice"
                  value={formData.exShowroomPrice}
                  onChange={handleChange}
                  min="0"
                  placeholder="For IDV calculation"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Previous NCB (%)
                </label>
                <select
                  name="previousNCB"
                  value={formData.previousNCB}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="0">0% (No NCB)</option>
                  <option value="20">20% (1 year claim-free)</option>
                  <option value="25">25% (2 years claim-free)</option>
                  <option value="35">35% (3 years claim-free)</option>
                  <option value="45">45% (4 years claim-free)</option>
                  <option value="50">50% (5+ years claim-free)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add-ons (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {addOnsList.map(addOn => (
                    <label key={addOn.id} className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.addOns.includes(addOn.id)}
                        onChange={() => handleAddOnToggle(addOn.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{addOn.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={calculatePremium}
                disabled={loading || !formData.engineCapacity}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Calculating...' : 'Calculate Premium'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Premium Breakdown</h2>
            
            {result ? (
              <div className="space-y-4">
                {result.idv && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">IDV (Insured Declared Value)</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.idv)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {result.tpPremium > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Third-Party Premium</span>
                      <span className="font-medium">{formatCurrency(result.tpPremium)}</span>
                    </div>
                  )}
                  {result.odPremium > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Own Damage Premium</span>
                      <span className="font-medium">{formatCurrency(result.odPremium)}</span>
                    </div>
                  )}
                  {result.addOnsPremium > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Add-ons</span>
                      <span className="font-medium">{formatCurrency(result.addOnsPremium)}</span>
                    </div>
                  )}
                  {result.ncbDiscount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>NCB Discount ({result.ncbPercentage}%)</span>
                      <span className="font-medium">-{formatCurrency(result.ncbDiscount)}</span>
                    </div>
                  )}
                  {result.gst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">GST (18%)</span>
                      <span className="font-medium">{formatCurrency(result.gst)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between text-2xl font-bold">
                    <span className="text-gray-900 dark:text-white">Total Premium</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(result.finalPremium)}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> This is an estimate. Final premium may vary based on vehicle details and insurer.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Fill in the details and click "Calculate Premium" to see the breakdown
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

