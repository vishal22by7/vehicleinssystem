'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import { policyAPI, calculatorAPI } from '@/lib/api';

interface PremiumBreakdown {
  basePremium: number;
  tpPremium: number;
  odPremium: number;
  addOnsPremium: number;
  ncbDiscount: number;
  gst: number;
  finalPremium: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [premium, setPremium] = useState<number>(0);
  const [premiumBreakdown, setPremiumBreakdown] = useState<PremiumBreakdown | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: '87623898790@paytm', // Pre-filled for demo
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    bankName: ''
  });
  const [policyTypes, setPolicyTypes] = useState<any[]>([]);
  const [loadingPolicyTypes, setLoadingPolicyTypes] = useState(true);

  useEffect(() => {
    // Fetch policy types first
    const fetchPolicyTypes = async () => {
      try {
        setLoadingPolicyTypes(true);
        const res = await calculatorAPI.getPolicyTypes();
        if (res.data.success && res.data.policyTypes && res.data.policyTypes.length > 0) {
          setPolicyTypes(res.data.policyTypes);
        } else {
          toast.warning('Policy types not available. Please contact admin.');
        }
      } catch (error) {
        console.error('Failed to load policy types:', error);
        toast.error('Failed to load policy types. Please refresh the page.');
      } finally {
        setLoadingPolicyTypes(false);
      }
    };
    fetchPolicyTypes();

    // Retrieve form data from sessionStorage
    const stored = sessionStorage.getItem('policyFormData');
    if (!stored) {
      toast.error('No policy data found. Please start from the beginning.');
      router.push('/buy-policy');
      return;
    }

    try {
      const data = JSON.parse(stored);
      setFormData(data);
      setPremium(data.premium || 0);
      setPremiumBreakdown(data.premiumBreakdown);
      
      // Files are stored in window.__policyFiles and will be validated on payment
    } catch (error) {
      toast.error('Invalid policy data');
      router.push('/buy-policy');
    }
  }, [router]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(e.target.value as 'upi' | 'card' | 'netbanking');
  };

  const handlePaymentDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPaymentDetails({
      ...paymentDetails,
      [e.target.name]: e.target.value
    });
  };

  const handlePayment = async () => {
    // DEMO MODE: No validation required, just proceed with payment
    setLoading(true);
    
    try {
      // Show processing message
      toast.info('Processing payment...');
      
      // Simulate brief payment processing (demo mode - always succeeds)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get files from window object (stored before navigation)
      const files = (window as any).__policyFiles || {};
      
      // Debug: Log files to see what we have
      console.log('Files from window.__policyFiles:', files);
      console.log('RC Document file:', files.rcDocument);
      console.log('File names from formData:', formData.fileNames);
      
      // Validate that RC document exists
      if (!files.rcDocument) {
        console.error('RC Document missing from files object');
        throw new Error('RC Document is required. Please go back to the Documents step and upload your RC document, then proceed to payment again.');
      }
      
      // Validate file is actually a File object
      if (!(files.rcDocument instanceof File)) {
        console.error('RC Document is not a valid File object:', typeof files.rcDocument);
        throw new Error('RC Document file is invalid. Please go back and upload your RC document again.');
      }
      
      // Create FormData for policy purchase
      const formDataToSend = new FormData();
      
      // Get policyTypeId from form data (user selected it during buy policy)
      const policyTypeId = formData.policyTypeId;
      
      if (!policyTypeId) {
        throw new Error('Policy type is required. Please go back and select a policy type.');
      }

      // Build ownerDetails object from form fields
      const ownerDetails = {
        name: formData.ownerName || '',
        dateOfBirth: formData.ownerDOB || '',
        mobile: formData.ownerMobile || '',
        email: formData.ownerEmail || '',
        address: formData.communicationAddress || {},
        pan: formData.pan || '',
        kycIdType: formData.kycIdType || '',
        kycIdNumber: formData.kycIdNumber || ''
      };

      // Build previousPolicy object from form fields
      const previousPolicy = {
        insurerName: formData.previousInsurer || '',
        policyNumber: formData.previousPolicyNumber || '',
        expiryDate: formData.previousExpiryDate || '',
        claimsInPreviousYear: formData.claimsInPreviousYear || false,
        ncbPercentage: parseFloat(formData.previousNCB || '0'),
        breakInInsurance: parseInt(formData.breakInInsurance || '0')
      };

      // Build nominee object from form fields
      const nominee = {
        name: formData.nomineeName || '',
        relation: formData.nomineeRelation || '',
        dateOfBirth: formData.nomineeDOB || '',
        isMinor: formData.nomineeIsMinor || false,
        appointee: formData.nomineeIsMinor ? {
          name: formData.appointeeName || '',
          relation: formData.appointeeRelation || ''
        } : {}
      };

      // FIRST: Add files (they're not in formData, they're in the files object)
      // RC Document is REQUIRED
      if (!files.rcDocument) {
        throw new Error('RC Document is required. Please go back and upload your RC document.');
      }
      if (!(files.rcDocument instanceof File)) {
        throw new Error('RC Document file is invalid. Please go back and upload your RC document again.');
      }
      formDataToSend.append('rcDocument', files.rcDocument);
      
      // Add other optional files
      if (files.salesInvoice && files.salesInvoice instanceof File) {
        formDataToSend.append('salesInvoice', files.salesInvoice);
      }
      if (files.previousPolicyCopy && files.previousPolicyCopy instanceof File) {
        formDataToSend.append('previousPolicyCopy', files.previousPolicyCopy);
      }
      if (files.puc && files.puc instanceof File) {
        formDataToSend.append('puc', files.puc);
      }
      if (files.dl && files.dl instanceof File) {
        formDataToSend.append('dl', files.dl);
      }
      
      // Add vehicle photos
      if (files.vehiclePhotos && Array.isArray(files.vehiclePhotos)) {
        files.vehiclePhotos.forEach((photo: File, index: number) => {
          if (photo instanceof File) {
            formDataToSend.append(`vehiclePhoto_${index}`, photo);
          }
        });
      }

      // Add all form fields with proper mapping
      Object.keys(formData).forEach(key => {
        if (key === 'addOns') {
          formDataToSend.append('addOns', JSON.stringify(formData.addOns || []));
        } else if (key === 'communicationAddress' || key === 'permanentAddress') {
          // These are included in ownerDetails, skip here
        } else if (key === 'declarations') {
          if (formData[key]) {
            formDataToSend.append(key, JSON.stringify(formData[key]));
          }
        } else if (key === 'vehiclePhotos' || key === 'rcDocument' || key === 'salesInvoice' || 
                   key === 'previousPolicyCopy' || key === 'puc' || key === 'dl') {
          // Files are already handled above, skip here
        } else if (key === 'make') {
          // Map 'make' to 'vehicleBrand'
          formDataToSend.append('vehicleBrand', String(formData[key] || ''));
        } else if (key === 'model') {
          // Map 'model' to 'vehicleModel'
          formDataToSend.append('vehicleModel', String(formData[key] || ''));
        } else if (key === 'policyType') {
          // Keep policyType as is (it's also needed)
          formDataToSend.append('policyType', String(formData[key] || 'Comprehensive'));
        } else if (key === 'yearOfManufacture') {
          // Map yearOfManufacture to modelYear if modelYear is not set
          formDataToSend.append('modelYear', String(formData.yearOfManufacture || formData.modelYear || new Date().getFullYear()));
        } else if (key === 'ownerName' || key === 'ownerDOB' || key === 'ownerMobile' || 
                   key === 'ownerEmail' || key === 'pan' || key === 'kycIdType' || key === 'kycIdNumber' ||
                   key === 'previousInsurer' || key === 'previousPolicyNumber' || key === 'previousExpiryDate' ||
                   key === 'claimsInPreviousYear' || key === 'previousNCB' || key === 'breakInInsurance' ||
                   key === 'nomineeName' || key === 'nomineeRelation' || key === 'nomineeDOB' || 
                   key === 'nomineeIsMinor' || key === 'appointeeName' || key === 'appointeeRelation') {
          // These are included in structured objects, skip here
        } else if (key !== 'premium' && key !== 'premiumBreakdown' && key !== 'startDate' && 
                   key !== 'endDate' && key !== 'fileNames' && key !== 'policyTypeId') {
          formDataToSend.append(key, String(formData[key] || ''));
        }
      });

      // Add structured objects
      formDataToSend.append('ownerDetails', JSON.stringify(ownerDetails));
      formDataToSend.append('previousPolicy', JSON.stringify(previousPolicy));
      formDataToSend.append('nominee', JSON.stringify(nominee));

      // Add required fields
      formDataToSend.append('policyTypeId', policyTypeId);
      formDataToSend.append('premium', String(premium));
      formDataToSend.append('startDate', formData.startDate);
      formDataToSend.append('endDate', formData.endDate);
      
      // CRITICAL: Ensure all required backend fields are set
      // These are required by backend validation and must be present
      
      // vehicleType (required) - use vehicleCategory or default
      if (!formDataToSend.has('vehicleType')) {
        const vehicleTypeValue = formData.vehicleType || formData.vehicleCategory || 'Car';
        formDataToSend.append('vehicleType', vehicleTypeValue);
      }
      
      // vehicleBrand (required) - mapped from 'make'
      if (!formDataToSend.has('vehicleBrand')) {
        const brandValue = formData.make || formData.vehicleBrand || '';
        if (brandValue) {
          formDataToSend.append('vehicleBrand', String(brandValue));
        }
      }
      
      // vehicleModel (required) - mapped from 'model'
      if (!formDataToSend.has('vehicleModel')) {
        const modelValue = formData.model || formData.vehicleModel || '';
        if (modelValue) {
          formDataToSend.append('vehicleModel', String(modelValue));
        }
      }
      
      // modelYear (required) - must be integer
      if (!formDataToSend.has('modelYear')) {
        const yearValue = formData.modelYear || formData.yearOfManufacture || new Date().getFullYear();
        formDataToSend.append('modelYear', String(parseInt(String(yearValue))));
      }
      
      // engineCapacity (required) - must be float
      if (!formDataToSend.has('engineCapacity')) {
        const capacityValue = formData.engineCapacity || '0';
        formDataToSend.append('engineCapacity', String(parseFloat(String(capacityValue))));
      }
      
      // registrationNumber (required)
      if (!formDataToSend.has('registrationNumber')) {
        const regNum = formData.registrationNumber || '';
        if (regNum) {
          formDataToSend.append('registrationNumber', String(regNum));
        }
      }
      
      // chassisNumber (required)
      if (!formDataToSend.has('chassisNumber')) {
        const chassisNum = formData.chassisNumber || '';
        if (chassisNum) {
          formDataToSend.append('chassisNumber', String(chassisNum));
        }
      }
      
      // Optional but helpful fields
      if (formData.vehicleCategory && !formDataToSend.has('vehicleCategory')) {
        formDataToSend.append('vehicleCategory', formData.vehicleCategory);
      }
      if (formData.coverType && !formDataToSend.has('coverType')) {
        formDataToSend.append('coverType', formData.coverType);
      }
      if (formData.registrationDate && !formDataToSend.has('registrationDate')) {
        formDataToSend.append('registrationDate', formData.registrationDate);
      }

      // Verify RC document is in FormData
      let hasRcDocument = false;
      for (const [key, value] of formDataToSend.entries()) {
        if (key === 'rcDocument' && value instanceof File) {
          hasRcDocument = true;
          break;
        }
      }
      
      if (!hasRcDocument) {
        throw new Error('RC Document was not added to FormData. Please go back and upload your RC document again.');
      }

      // Create the policy (payment is considered successful in demo mode)
      const res = await policyAPI.buy(formDataToSend);
      if (res.data.success) {
        // Clear sessionStorage and files
        sessionStorage.removeItem('policyFormData');
        delete (window as any).__policyFiles;
        toast.success('Payment successful! Policy purchased.');
        router.push('/policies');
      } else {
        throw new Error('Failed to create policy');
      }
    } catch (error: any) {
      // Show detailed error message
      let errorMessage = 'Failed to process payment. Please try again.';
      
      if (error.response?.data) {
        // If there are validation errors, show them
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          const errorList = error.response.data.errors.map((e: any) => 
            e.msg || e.message || `${e.param || 'Field'}: ${e.msg || e.message || 'Invalid'}`
          ).join(', ');
          errorMessage = `Validation errors: ${errorList}`;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Payment error:', error.response?.data || error.message);
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!formData || loadingPolicyTypes) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading payment details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Payment
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Complete your payment to purchase the policy
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payment Summary */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Premium Summary</h2>
                
                {premiumBreakdown ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-3">
                    {premiumBreakdown.tpPremium > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Third-Party Premium</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.tpPremium)}</span>
                      </div>
                    )}
                    {premiumBreakdown.odPremium > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Own Damage Premium</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.odPremium)}</span>
                      </div>
                    )}
                    {premiumBreakdown.addOnsPremium > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Add-ons</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.addOnsPremium)}</span>
                      </div>
                    )}
                    {premiumBreakdown.ncbDiscount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>NCB Discount</span>
                        <span className="font-medium">-{formatCurrency(premiumBreakdown.ncbDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-gray-300 dark:border-gray-600">
                      <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.basePremium)}</span>
                    </div>
                    {premiumBreakdown.gst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">GST (18%)</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.gst)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-400 dark:border-gray-500">
                      <span className="text-gray-900 dark:text-white">Total Amount</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatCurrency(premium)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(premium)}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Demo Mode:</strong> Click "Pay" to complete the purchase. No actual payment will be processed. All payment details are optional for demonstration purposes.
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Select Payment Method</h2>
                
                <div className="space-y-4 mb-6">
                  <label className="flex items-center p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={handlePaymentChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-gray-900 dark:text-white font-medium">UPI</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Pay using UPI ID</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={handlePaymentChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-gray-900 dark:text-white font-medium">Credit/Debit Card</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Visa, Mastercard, RuPay</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="netbanking"
                      checked={paymentMethod === 'netbanking'}
                      onChange={handlePaymentChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-gray-900 dark:text-white font-medium">Net Banking</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Direct bank transfer</p>
                    </div>
                  </label>
                </div>

                {/* Payment Details Form */}
                <div className="space-y-4">
                  {paymentMethod === 'upi' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        UPI ID <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional for demo)</span>
                      </label>
                      <input
                        type="text"
                        name="upiId"
                        value={paymentDetails.upiId}
                        onChange={handlePaymentDetailsChange}
                        placeholder="yourname@paytm"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Card Number <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional for demo)</span>
                        </label>
                        <input
                          type="text"
                          name="cardNumber"
                          value={paymentDetails.cardNumber}
                          onChange={handlePaymentDetailsChange}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Cardholder Name <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional for demo)</span>
                        </label>
                        <input
                          type="text"
                          name="cardName"
                          value={paymentDetails.cardName}
                          onChange={handlePaymentDetailsChange}
                          placeholder="John Doe"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Expiry (MM/YY) <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            name="cardExpiry"
                            value={paymentDetails.cardExpiry}
                            onChange={handlePaymentDetailsChange}
                            placeholder="12/25"
                            maxLength={5}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            CVV <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            name="cardCvv"
                            value={paymentDetails.cardCvv}
                            onChange={handlePaymentDetailsChange}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Bank <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional for demo)</span>
                      </label>
                      <select
                        name="bankName"
                        value={paymentDetails.bankName}
                        onChange={handlePaymentDetailsChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Bank (Optional)</option>
                        <option value="SBI">State Bank of India</option>
                        <option value="HDFC">HDFC Bank</option>
                        <option value="ICICI">ICICI Bank</option>
                        <option value="Axis">Axis Bank</option>
                        <option value="Kotak">Kotak Mahindra Bank</option>
                        <option value="PNB">Punjab National Bank</option>
                        <option value="BOI">Bank of India</option>
                        <option value="BOB">Bank of Baroda</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="flex-1 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Processing...' : `Pay ${formatCurrency(premium)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

