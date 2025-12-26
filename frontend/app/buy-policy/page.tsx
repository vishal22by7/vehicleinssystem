'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import ProtectedRoute from '@/components/ProtectedRoute';
import Tooltip from '@/components/Tooltip';
import { calculatorAPI, policyAPI } from '@/lib/api';

interface FormData {
  // Step 1: Vehicle & Policy Type
  vehicleCategory: string;
  policyType: string;
  policyTypeId: string; // ID from database
  coverType: string;

  // Step 2: Vehicle Details
  registrationNumber: string;
  registrationDate: string;
  rtoState: string;
  rtoCity: string;
  make: string;
  model: string;
  variant: string;
  fuelType: string;
  engineCapacity: string;
  yearOfRegistration: string;
  engineNumber: string;
  chassisNumber: string;
  seatingCapacity: string;
  isFinanced: boolean;
  financierName: string;

  // Step 3: Previous Policy
  previousInsurer: string;
  previousPolicyNumber: string;
  previousExpiryDate: string;
  claimsInPreviousYear: boolean;
  previousNCB: string;
  breakInInsurance: string;

  // Step 4: Owner/Proposer
  ownerName: string;
  ownerDOB: string;
  ownerMobile: string;
  ownerEmail: string;
  communicationAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  permanentAddress: {
    sameAsCommunication: boolean;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  pan: string;
  kycIdType: string;
  kycIdNumber: string;

  // Step 5: Nominee
  nomineeName: string;
  nomineeRelation: string;
  nomineeDOB: string;
  nomineeIsMinor: boolean;
  appointeeName: string;
  appointeeRelation: string;

  // Step 6: Add-ons
  addOns: string[];

  // Step 7: Documents
  rcDocument: File | null;
  salesInvoice: File | null;
  previousPolicyCopy: File | null;
  puc: File | null;
  dl: File | null;
  vehiclePhotos: File[];

  // Step 8: Declarations
  declarations: {
    vehicleUseTruthful: boolean;
    noFraudulentHistory: boolean;
    previousClaimsHonest: boolean;
    modificationsDisclosed: boolean;
    policyWordingAccepted: boolean;
    ePolicyConsent: boolean;
  };
}

const initialFormData: FormData = {
  vehicleCategory: '',
  policyType: '',
  policyTypeId: '',
  coverType: '',
  registrationNumber: '',
  registrationDate: new Date().toISOString().split('T')[0], // Set to today's date by default
  rtoState: '',
  rtoCity: '',
  make: '',
  model: '',
  variant: '',
  fuelType: '',
  engineCapacity: '',
  yearOfRegistration: new Date().getFullYear().toString(),
  engineNumber: '',
  chassisNumber: '',
  seatingCapacity: '',
  isFinanced: false,
  financierName: '',
  previousInsurer: '',
  previousPolicyNumber: '',
  previousExpiryDate: '',
  claimsInPreviousYear: false,
  previousNCB: '0',
  breakInInsurance: '0',
  ownerName: '',
  ownerDOB: '',
  ownerMobile: '',
  ownerEmail: '',
  communicationAddress: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  },
  permanentAddress: {
    sameAsCommunication: true,
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  },
  pan: '',
  kycIdType: '',
  kycIdNumber: '',
  nomineeName: '',
  nomineeRelation: '',
  nomineeDOB: '',
  nomineeIsMinor: false,
  appointeeName: '',
  appointeeRelation: '',
  addOns: [],
  rcDocument: null,
  salesInvoice: null,
  previousPolicyCopy: null,
  puc: null,
  dl: null,
  vehiclePhotos: [],
  declarations: {
    vehicleUseTruthful: false,
    noFraudulentHistory: false,
    previousClaimsHonest: false,
    modificationsDisclosed: false,
    policyWordingAccepted: false,
    ePolicyConsent: false,
  },
};

const steps = [
  'Vehicle & Policy',
  'Vehicle Details',
  'Previous Policy',
  'Owner Details',
  'Nominee',
  'Add-ons',
  'Documents',
  'Declarations',
  'Summary & Payment',
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
];

const addOnsList = [
  { id: 'zeroDepreciation', name: 'Zero Depreciation', description: 'No depreciation deduction during claims' },
  { id: 'engineProtector', name: 'Engine Protector', description: 'Covers engine hydrolock/water damage' },
  { id: 'returnToInvoice', name: 'Return To Invoice (RTI)', description: 'Pays full invoice price if total loss' },
  { id: 'ncbProtector', name: 'NCB Protector', description: 'Keeps your NCB even after claim' },
  { id: 'roadsideAssistance', name: 'Roadside Assistance', description: 'Towing, emergency help' },
  { id: 'keyLockCover', name: 'Key & Lock Cover', description: 'Loss of keys replacement' },
  { id: 'tyreProtection', name: 'Tyre Protection', description: 'Tyre damage coverage' },
  { id: 'consumablesCover', name: 'Consumables Cover', description: 'Nuts, bolts, oils, etc.' },
];

export default function BuyPolicyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [premium, setPremium] = useState<number | null>(null);
  const [premiumBreakdown, setPremiumBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculatingPremium, setCalculatingPremium] = useState(false);
  const [policyTypes, setPolicyTypes] = useState<any[]>([]);

  useEffect(() => {
    fetchPolicyTypes();
  }, []);

  useEffect(() => {
    // Calculate premium when reaching the summary step (step 9, index 8)
    if (currentStep === 8) {
      // Check if we have all required fields
      if (formData.vehicleCategory && formData.policyTypeId && formData.engineCapacity && formData.yearOfRegistration) {
        // Always recalculate if premium is null, 0, or breakdown is missing
        if (premium === null || premium === 0 || !premiumBreakdown || (premiumBreakdown && premiumBreakdown.finalPremium === 0)) {
          console.log('🔄 Recalculating premium on summary step...');
          calculatePremium();
        }
      } else {
        // Show error if we're on the summary step but missing data
        if (premium === null || premium === 0) {
          toast.error('Please complete all required fields to calculate premium');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.vehicleCategory, formData.policyTypeId, formData.engineCapacity, formData.yearOfRegistration]);

  const fetchPolicyTypes = async () => {
    try {
      const res = await calculatorAPI.getPolicyTypes();
      if (res.data.success) {
        setPolicyTypes(res.data.policyTypes);
      }
    } catch (error) {
      toast.error('Failed to load policy types');
    }
  };

  const calculatePremium = async () => {
    if (!formData.vehicleCategory || !formData.policyTypeId || !formData.engineCapacity) {
      return;
    }

    setCalculatingPremium(true);
    try {
      // Get the selected policy type to get its name
      const selectedPolicyType = policyTypes.find(pt => (pt.id || pt._id) === formData.policyTypeId);
      const policyTypeName = selectedPolicyType?.name || formData.policyType;
      
      if (!selectedPolicyType) {
        console.error('Policy type not found for ID:', formData.policyTypeId);
        throw new Error('Selected policy type not found. Please select a policy type again.');
      }
      
      if (!policyTypeName || policyTypeName.trim() === '') {
        console.error('Policy type name is empty:', { selectedPolicyType, formData });
        throw new Error('Policy type name is required for premium calculation');
      }

      // Convert addOns array to format expected by backend (array of addOn IDs/names)
      const addOnsArray = Array.isArray(formData.addOns) ? formData.addOns : [];

      // Ensure registration date is set to today for premium calculation
      const todayDate = new Date().toISOString().split('T')[0];
      const registrationDateForCalc = formData.registrationDate || todayDate;

      // Use the policy type name from the selected policy type, not formData.policyType
      // Default exShowroomPrice based on vehicle category if not provided
      const defaultExShowroomPrice = formData.vehicleCategory === '2W' ? 100000 : 500000;
      const exShowroomPrice = parseFloat((formData as any).exShowroomPrice) || defaultExShowroomPrice;
      
      const requestData = {
        vehicleCategory: formData.vehicleCategory,
        policyType: policyTypeName, // Always use the policy type name from database
        engineCapacity: parseFloat(formData.engineCapacity) || 0,
        yearOfRegistration: parseInt(formData.yearOfRegistration) || new Date().getFullYear(),
        registrationDate: registrationDateForCalc,
        exShowroomPrice: exShowroomPrice,
        previousNCB: parseFloat(formData.previousNCB) || 0,
        addOns: addOnsArray,
        vehicleType: formData.make || 'Car'
      };
      
      console.log('📤 Premium Calculation Request:', {
        vehicleCategory: requestData.vehicleCategory,
        policyType: requestData.policyType,
        engineCapacity: requestData.engineCapacity,
        exShowroomPrice: requestData.exShowroomPrice,
        yearOfRegistration: requestData.yearOfRegistration
      });
      
      // Validate required fields
      if (!requestData.engineCapacity || requestData.engineCapacity <= 0) {
        throw new Error('Engine capacity is required and must be greater than 0');
      }
      
      if (!requestData.policyType || requestData.policyType.trim() === '') {
        throw new Error('Policy type is required');
      }

      const res = await calculatorAPI.calculatePremium(requestData);

      if (res.data && res.data.success) {
        const calculation = res.data.calculation;
        const finalPremium = calculation.finalPremium || 0;
        
        // Validate that we got a valid premium
        if (finalPremium <= 0) {
          console.error('Premium calculation returned zero or negative:', calculation);
          throw new Error('Premium calculation returned invalid result. Please check your vehicle details and try again.');
        }
        
        setPremium(finalPremium);
        setPremiumBreakdown(calculation);
        console.log('✅ Premium calculated successfully:', finalPremium);
      } else {
        throw new Error(res.data?.message || 'Failed to calculate premium');
      }
    } catch (error: any) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Premium calculation error:', error.response?.data || error.message);
      }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to calculate premium. Please check your inputs.';
      toast.error(errorMessage);
      // Don't set premium to 0 on error - keep it as null so user can retry
      // Only set to 0 if the API explicitly returns 0
      if (error.response?.data?.calculation?.finalPremium === 0) {
        setPremium(0);
        setPremiumBreakdown(error.response.data.calculation);
      } else {
        // Keep premium as null so the "Retry Calculation" button shows
        setPremium(null);
        setPremiumBreakdown(null);
      }
    } finally {
      setCalculatingPremium(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof FormData] as any),
          [child]: type === 'checkbox' ? checked : value,
        },
      }));
    } else if (name.startsWith('declaration')) {
      // Convert "declarationVehicleUseTruthful" to "vehicleUseTruthful"
      const key = name.replace('declaration', '');
      // Convert first letter to lowercase: "VehicleUseTruthful" -> "vehicleUseTruthful"
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      setFormData(prev => ({
        ...prev,
        declarations: {
          ...prev.declarations,
          [camelKey]: checked,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const files = e.target.files;
    
    if (files && files.length > 0) {
      if (name === 'vehiclePhotos') {
        // For multiple file input, add ALL selected files
        const newPhotos = Array.from(files);
        setFormData(prev => ({
          ...prev,
          vehiclePhotos: [...prev.vehiclePhotos, ...newPhotos],
        }));
      } else {
        // For single file inputs, use the first file
        setFormData(prev => ({
          ...prev,
          [name]: files[0],
        }));
      }
    }
  };

  const handleAddOnToggle = (addOnId: string) => {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.includes(addOnId)
        ? prev.addOns.filter(id => id !== addOnId)
        : [...prev.addOns, addOnId],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.vehicleCategory && formData.policyTypeId && formData.coverType);
      case 1:
        // registrationDate is auto-set to today, so we don't need to validate it
        return !!(formData.registrationNumber && formData.make && 
                  formData.model && formData.fuelType && formData.engineCapacity && 
                  formData.yearOfRegistration && formData.chassisNumber && formData.seatingCapacity);
      case 2:
        return true; // Optional step
      case 3:
        return !!(formData.ownerName && formData.ownerDOB && formData.ownerMobile && 
                  formData.ownerEmail && formData.communicationAddress.line1 && 
                  formData.communicationAddress.city && formData.communicationAddress.state && 
                  formData.communicationAddress.pincode && formData.pan);
      case 4:
        return !!(formData.nomineeName && formData.nomineeRelation && formData.nomineeDOB);
      case 5:
        return true; // Optional
      case 6:
        return !!formData.rcDocument; // RC is required
      case 7:
        return Object.values(formData.declarations).every(v => v === true);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error('Please fill all required fields');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleProceedToPayment = async () => {
    try {
      // Ensure registration date is set to today (in case it wasn't initialized)
      const todayDate = new Date().toISOString().split('T')[0];
      const formDataWithToday = {
        ...formData,
        registrationDate: formData.registrationDate || todayDate
      };

      // Store form data in sessionStorage for payment page
      // Note: Files can't be stored in sessionStorage, so we'll handle them separately
      const formDataToStore: any = {
        ...formDataWithToday,
        premium,
        premiumBreakdown,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      };

      // Remove file objects from stored data (they can't be serialized)
      delete formDataToStore.rcDocument;
      delete formDataToStore.salesInvoice;
      delete formDataToStore.previousPolicyCopy;
      delete formDataToStore.puc;
      delete formDataToStore.dl;
      delete formDataToStore.vehiclePhotos;

      // Store file names for reference
      formDataToStore.fileNames = {
        rcDocument: formData.rcDocument?.name || null,
        salesInvoice: formData.salesInvoice?.name || null,
        previousPolicyCopy: formData.previousPolicyCopy?.name || null,
        puc: formData.puc?.name || null,
        dl: formData.dl?.name || null,
        vehiclePhotos: formData.vehiclePhotos.map((f: File) => f.name)
      };

      sessionStorage.setItem('policyFormData', JSON.stringify(formDataToStore));
      
      // Validate RC document before proceeding
      if (!formData.rcDocument) {
        toast.error('RC Document is required. Please upload your RC document before proceeding.');
        return;
      }
      
      // Store files in a temporary object that will be accessed during payment
      // Ensure all files are valid File objects
      const filesToStore: any = {};
      if (formData.rcDocument instanceof File) {
        filesToStore.rcDocument = formData.rcDocument;
      } else {
        toast.error('RC Document is invalid. Please upload your RC document again.');
        return;
      }
      
      if (formData.salesInvoice instanceof File) {
        filesToStore.salesInvoice = formData.salesInvoice;
      }
      if (formData.previousPolicyCopy instanceof File) {
        filesToStore.previousPolicyCopy = formData.previousPolicyCopy;
      }
      if (formData.puc instanceof File) {
        filesToStore.puc = formData.puc;
      }
      if (formData.dl instanceof File) {
        filesToStore.dl = formData.dl;
      }
      if (Array.isArray(formData.vehiclePhotos) && formData.vehiclePhotos.length > 0) {
        filesToStore.vehiclePhotos = formData.vehiclePhotos.filter((f: any) => f instanceof File);
      }
      
      (window as any).__policyFiles = filesToStore;

      router.push('/payment');
    } catch (error) {
      toast.error('Failed to proceed to payment');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Buy Insurance Policy
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Complete the form below to purchase your vehicle insurance
            </p>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === currentStep
                            ? 'bg-blue-600 text-white'
                            : index < currentStep
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {index < currentStep ? '✓' : index + 1}
                      </div>
                      <div className="text-xs mt-2 text-center text-gray-600 dark:text-gray-300 hidden md:block font-medium">
                        {step}
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-1 flex-1 mx-2 ${
                          index < currentStep ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Steps */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              {/* Step 1: Vehicle & Policy Type */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select Vehicle & Policy Type</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Vehicle Category *
                      </label>
                      <select
                        name="vehicleCategory"
                        value={formData.vehicleCategory}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Category</option>
                        <option value="2W">Two Wheeler</option>
                        <option value="4W">Four Wheeler</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Policy Type *
                      </label>
                      <select
                        name="policyTypeId"
                        value={formData.policyTypeId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedPolicyType = policyTypes.find(pt => pt.id === selectedId);
                          setFormData(prev => ({
                            ...prev,
                            policyTypeId: selectedId,
                            policyType: selectedPolicyType?.name || ''
                          }));
                        }}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Policy Type</option>
                        {policyTypes
                          .filter(pt => {
                            // Filter policy types based on vehicle category
                            const category = formData.vehicleCategory?.toUpperCase() || '';
                            const name = pt.name?.toLowerCase() || '';
                            
                            if (category === '2W') {
                              return name.includes('two-wheeler');
                            } else if (category === '4W') {
                              return !name.includes('two-wheeler') && !name.includes('commercial');
                            }
                            return true; // Show all if no category selected
                          })
                          .map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name} - {pt.description}
                            </option>
                          ))}
                      </select>
                      {formData.policyTypeId && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {policyTypes.find(pt => pt.id === formData.policyTypeId)?.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cover Type *
                      </label>
                      <select
                        name="coverType"
                        value={formData.coverType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Cover</option>
                        <option value="New">New Vehicle</option>
                        <option value="Renewal">Renewal</option>
                        <option value="Transfer">Transfer of Ownership</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Vehicle Details */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicle Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Registration Number *</span>
                          <Tooltip 
                            title="Registration Number"
                            text="Vehicle registration number from your RC. Format: State code + 2 digits + letters + 4 digits (e.g., MH12AB1234)"
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Registration Number"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                        placeholder="e.g., MH12AB1234"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>RTO State *</span>
                          <Tooltip 
                            title="RTO State"
                            text="State where your vehicle is registered. This should match the state code in your registration number (e.g., MH for Maharashtra)."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about RTO State"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <select
                        name="rtoState"
                        value={formData.rtoState}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select State</option>
                        {indianStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>RTO City *</span>
                          <Tooltip 
                            title="RTO City"
                            text="City where your vehicle is registered with the Regional Transport Office (RTO)."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about RTO City"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="rtoCity"
                        value={formData.rtoCity}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Make (Brand) *</span>
                          <Tooltip 
                            title="Make (Brand)"
                            text="Vehicle manufacturer or brand name (e.g., Maruti Suzuki, Honda, Hyundai, Tata, Mahindra)."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Make"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="make"
                        value={formData.make}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., Maruti, Honda, Hyundai"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Model *</span>
                          <Tooltip 
                            title="Model"
                            text="Vehicle model name (e.g., Swift, City, i20, Nexon). This is the specific model from the manufacturer."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Model"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Variant *</span>
                          <Tooltip 
                            title="Variant"
                            text="Specific variant or trim level of your vehicle (e.g., VDI, ZXI, VX, LDI). Found on your invoice or RC."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Variant"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="variant"
                        value={formData.variant}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Fuel Type *</span>
                          <Tooltip 
                            title="Fuel Type"
                            text="Type of fuel your vehicle uses. Select the primary fuel type (Petrol, Diesel, CNG, Electric, or Hybrid)."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Fuel Type"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <select
                        name="fuelType"
                        value={formData.fuelType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select Fuel</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="CNG">CNG</option>
                        <option value="Electric">Electric</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Engine Capacity (CC) *</span>
                          <Tooltip 
                            title="Engine Capacity"
                            text="Engine displacement in cubic centimeters (CC). For 2-wheelers: typically 100-350cc. For cars: typically 1000-3000cc. Found on your RC or invoice. Used to calculate third-party premium."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Engine Capacity"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
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
                        <div className="flex items-center gap-2">
                          <span>Year of Registration *</span>
                          <Tooltip 
                            title="Year of Registration"
                            text="Year when your vehicle was first registered with the RTO (Regional Transport Office). This is usually the same year you bought the vehicle from the showroom, but it's the official registration date shown on your RC (Registration Certificate). This year is used for all insurance calculations including vehicle age, depreciation, and IDV. For insurance purposes, vehicle age is calculated from registration date, not manufacture date."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Year of Registration"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="number"
                        name="yearOfRegistration"
                        value={formData.yearOfRegistration}
                        onChange={handleChange}
                        required
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Chassis Number (VIN) *</span>
                          <Tooltip 
                            title="Chassis Number (VIN)"
                            text="17-character Vehicle Identification Number (VIN) or Chassis Number. Found on your RC, invoice, or engine bay. Format: Letters and numbers only (no I, O, Q to avoid confusion)."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Chassis Number"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="chassisNumber"
                        value={formData.chassisNumber}
                        onChange={(e) => {
                          const cleaned = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
                          setFormData(prev => ({ ...prev, chassisNumber: cleaned }));
                        }}
                        required
                        maxLength={17}
                        pattern="[A-HJ-NPR-Z0-9]{17}"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                        placeholder="17-character VIN"
                      />
                      {formData.chassisNumber && formData.chassisNumber.length !== 17 && (
                        <p className="mt-1 text-xs text-red-600">Must be exactly 17 characters</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Seating Capacity *</span>
                          <Tooltip 
                            title="Seating Capacity"
                            text="Total number of seats including driver. For 2-wheelers: usually 2. For cars: typically 4-7. Found on your RC."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Seating Capacity"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="number"
                        name="seatingCapacity"
                        value={formData.seatingCapacity}
                        onChange={handleChange}
                        required
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Engine Number</span>
                          <Tooltip 
                            title="Engine Number"
                            text="Engine number engraved on your vehicle's engine block. Usually found on the engine or in your RC. Optional but recommended for verification."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Engine Number"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="engineNumber"
                        value={formData.engineNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isFinanced"
                          checked={formData.isFinanced}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Is the vehicle financed?
                        </span>
                      </label>
                      {formData.isFinanced && (
                        <input
                          type="text"
                          name="financierName"
                          value={formData.financierName}
                          onChange={handleChange}
                          placeholder="Financier Name"
                          className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Previous Policy */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Previous Policy Details</h2>
                  <p className="text-gray-600 dark:text-gray-400">Skip if this is your first policy</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Previous Insurer</span>
                          <Tooltip 
                            title="Previous Insurer"
                            text="Name of your previous insurance company (e.g., HDFC Ergo, ICICI Lombard, Bajaj Allianz). Optional if this is your first policy."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Previous Insurer"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="previousInsurer"
                        value={formData.previousInsurer}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Previous Policy Number</span>
                          <Tooltip 
                            title="Previous Policy Number"
                            text="Policy number from your previous insurance policy. Found on your old policy document. Optional if this is your first policy."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Previous Policy Number"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="previousPolicyNumber"
                        value={formData.previousPolicyNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Previous Expiry Date</span>
                          <Tooltip 
                            title="Previous Expiry Date"
                            text="Expiry date of your previous insurance policy. Used to calculate break in insurance period. Optional if this is your first policy."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Previous Expiry Date"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="date"
                        name="previousExpiryDate"
                        value={formData.previousExpiryDate}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Previous NCB (%)</span>
                          <Tooltip 
                            title="No Claim Bonus (NCB)"
                            text="Percentage from your previous policy. NCB gives discount on premium: 0% (no claims), 20% (1 year), 25% (2 years), 35% (3 years), 45% (4 years), 50% (5+ years). Select 0% if this is your first policy."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about NCB"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <select
                        name="previousNCB"
                        value={formData.previousNCB}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="25">25%</option>
                        <option value="35">35%</option>
                        <option value="45">45%</option>
                        <option value="50">50%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>Break in Insurance (days)</span>
                          <Tooltip 
                            title="Break in Insurance"
                            text="Number of days between expiry of previous policy and start of new policy. If you renewed immediately, enter 0. Used to determine if NCB is applicable."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about Break in Insurance"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="number"
                        name="breakInInsurance"
                        value={formData.breakInInsurance}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="claimsInPreviousYear"
                          checked={formData.claimsInPreviousYear}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Claims made in previous year?
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Owner/Proposer Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Owner/Proposer Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        name="ownerDOB"
                        value={formData.ownerDOB}
                        onChange={handleChange}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        name="ownerMobile"
                        value={formData.ownerMobile}
                        onChange={handleChange}
                        required
                        maxLength={10}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="ownerEmail"
                        value={formData.ownerEmail}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>PAN Number *</span>
                          <Tooltip 
                            title="PAN Number"
                            text="Permanent Account Number (PAN) issued by Income Tax Department. Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F). Required for insurance policies above ₹50,000."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about PAN Number"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <input
                        type="text"
                        name="pan"
                        value={formData.pan}
                        onChange={(e) => {
                          const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                          setFormData(prev => ({ ...prev, pan: cleaned }));
                        }}
                        required
                        maxLength={10}
                        pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                        placeholder="ABCDE1234F"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <span>KYC ID Type</span>
                          <Tooltip 
                            title="KYC ID Type"
                            text="Type of identity document for KYC verification. Select Aadhaar, Driving License, Passport, or Voter ID. Optional but recommended."
                            position="right"
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Information about KYC ID Type"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </label>
                      <select
                        name="kycIdType"
                        value={formData.kycIdType}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select ID Type</option>
                        <option value="Aadhaar">Aadhaar</option>
                        <option value="Passport">Passport</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Voter ID">Voter ID</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        KYC ID Number
                      </label>
                      <input
                        type="text"
                        name="kycIdNumber"
                        value={formData.kycIdNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Communication Address *</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          name="communicationAddress.line1"
                          value={formData.communicationAddress.line1}
                          onChange={handleChange}
                          required
                          placeholder="Address Line 1"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          name="communicationAddress.line2"
                          value={formData.communicationAddress.line2}
                          onChange={handleChange}
                          placeholder="Address Line 2"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="communicationAddress.city"
                          value={formData.communicationAddress.city}
                          onChange={handleChange}
                          required
                          placeholder="City *"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <select
                          name="communicationAddress.state"
                          value={formData.communicationAddress.state}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select State *</option>
                          {indianStates.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          name="communicationAddress.pincode"
                          value={formData.communicationAddress.pincode}
                          onChange={handleChange}
                          required
                          maxLength={6}
                          placeholder="PIN Code *"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Nominee */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nominee Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nominee Name *
                      </label>
                      <input
                        type="text"
                        name="nomineeName"
                        value={formData.nomineeName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Relation *
                      </label>
                      <input
                        type="text"
                        name="nomineeRelation"
                        value={formData.nomineeRelation}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., Spouse, Father, Mother"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        name="nomineeDOB"
                        value={formData.nomineeDOB}
                        onChange={handleChange}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="nomineeIsMinor"
                          checked={formData.nomineeIsMinor}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Nominee is a minor
                        </span>
                      </label>
                    </div>

                    {formData.nomineeIsMinor && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Appointee Name *
                          </label>
                          <input
                            type="text"
                            name="appointeeName"
                            value={formData.appointeeName}
                            onChange={handleChange}
                            required={formData.nomineeIsMinor}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Appointee Relation *
                          </label>
                          <input
                            type="text"
                            name="appointeeRelation"
                            value={formData.appointeeRelation}
                            onChange={handleChange}
                            required={formData.nomineeIsMinor}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: Add-ons */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add-ons (Optional)</h2>
                  <p className="text-gray-600 dark:text-gray-400">Select additional coverage options</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addOnsList.map((addOn) => (
                      <div
                        key={addOn.id}
                        onClick={() => handleAddOnToggle(addOn.id)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          formData.addOns.includes(addOn.id)
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            checked={formData.addOns.includes(addOn.id)}
                            onChange={() => handleAddOnToggle(addOn.id)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{addOn.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{addOn.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 7: Documents */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Documents</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        RC Document * (JPG, PNG, PDF, max 5MB)
                      </label>
                      <input
                        type="file"
                        name="rcDocument"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {formData.rcDocument && (
                        <p className="mt-1 text-sm text-green-600">✓ {formData.rcDocument.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sales Invoice (JPG, PNG, PDF, max 5MB)
                      </label>
                      <input
                        type="file"
                        name="salesInvoice"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {formData.salesInvoice && (
                        <p className="mt-1 text-sm text-green-600">✓ {formData.salesInvoice.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Previous Policy Copy (JPG, PNG, PDF, max 5MB)
                      </label>
                      <input
                        type="file"
                        name="previousPolicyCopy"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {formData.previousPolicyCopy && (
                        <p className="mt-1 text-sm text-green-600">✓ {formData.previousPolicyCopy.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        PUC Certificate (JPG, PNG, PDF, max 5MB)
                      </label>
                      <input
                        type="file"
                        name="puc"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {formData.puc && (
                        <p className="mt-1 text-sm text-green-600">✓ {formData.puc.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Driving License (JPG, PNG, PDF, max 5MB)
                      </label>
                      <input
                        type="file"
                        name="dl"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {formData.dl && (
                        <p className="mt-1 text-sm text-green-600">✓ {formData.dl.name}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Vehicle Photos (Front, Rear, Left, Right, Odometer, VIN) - JPG, PNG, max 5MB each
                      </label>
                      <input
                        type="file"
                        name="vehiclePhotos"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png"
                        multiple
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {formData.vehiclePhotos.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-green-600 font-medium">
                            ✓ {formData.vehiclePhotos.length} photo(s) selected:
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                            {formData.vehiclePhotos.map((photo: File, index: number) => (
                              <li key={index} className="flex items-center justify-between">
                                <span>• {photo.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    vehiclePhotos: prev.vehiclePhotos.filter((_: File, i: number) => i !== index)
                                  }))}
                                  className="text-red-500 hover:text-red-700 ml-2"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 8: Declarations */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Declarations</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">Please read and accept all declarations</p>
                  
                  <div className="space-y-4">
                    <label className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors group">
                      <input
                        type="checkbox"
                        name="declarationVehicleUseTruthful"
                        checked={formData.declarations.vehicleUseTruthful}
                        onChange={handleChange}
                        required
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 dark:border-gray-500 rounded cursor-pointer bg-white dark:bg-gray-700 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 transition-colors"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                        I declare that the information provided about vehicle use is truthful and accurate. *
                      </span>
                    </label>

                    <label className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors group">
                      <input
                        type="checkbox"
                        name="declarationNoFraudulentHistory"
                        checked={formData.declarations.noFraudulentHistory}
                        onChange={handleChange}
                        required
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 dark:border-gray-500 rounded cursor-pointer bg-white dark:bg-gray-700 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 transition-colors"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                        I declare that I have no fraudulent insurance history. *
                      </span>
                    </label>

                    <label className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors group">
                      <input
                        type="checkbox"
                        name="declarationPreviousClaimsHonest"
                        checked={formData.declarations.previousClaimsHonest}
                        onChange={handleChange}
                        required
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 dark:border-gray-500 rounded cursor-pointer bg-white dark:bg-gray-700 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 transition-colors"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                        I declare that all previous claims information provided is honest and complete. *
                      </span>
                    </label>

                    <label className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors group">
                      <input
                        type="checkbox"
                        name="declarationModificationsDisclosed"
                        checked={formData.declarations.modificationsDisclosed}
                        onChange={handleChange}
                        required
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 dark:border-gray-500 rounded cursor-pointer bg-white dark:bg-gray-700 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 transition-colors"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                        I declare that all vehicle modifications have been disclosed. *
                      </span>
                    </label>

                    <label className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors group">
                      <input
                        type="checkbox"
                        name="declarationPolicyWordingAccepted"
                        checked={formData.declarations.policyWordingAccepted}
                        onChange={handleChange}
                        required
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 dark:border-gray-500 rounded cursor-pointer bg-white dark:bg-gray-700 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 transition-colors"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                        I accept the policy wording and terms & conditions. *
                      </span>
                    </label>

                    <label className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors group">
                      <input
                        type="checkbox"
                        name="declarationEPolicyConsent"
                        checked={formData.declarations.ePolicyConsent}
                        onChange={handleChange}
                        required
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 dark:border-gray-500 rounded cursor-pointer bg-white dark:bg-gray-700 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-600 dark:checked:border-blue-600 transition-colors"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                        I consent to receive e-policy documents. *
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 9: Summary & Payment */}
              {currentStep === 8 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Premium Summary & Payment</h2>
                  
                  {calculatingPremium ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Calculating premium...</p>
                    </div>
                  ) : premium !== null && premium !== undefined && premiumBreakdown ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                      <div className="space-y-3">
                        {premiumBreakdown.basePremium !== undefined && premiumBreakdown.basePremium > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Base Premium</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.basePremium)}</span>
                          </div>
                        )}
                        {premiumBreakdown.tpPremium !== undefined && premiumBreakdown.tpPremium > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Third-Party Premium</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.tpPremium)}</span>
                          </div>
                        )}
                        {premiumBreakdown.odPremium !== undefined && premiumBreakdown.odPremium > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Own Damage Premium</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.odPremium)}</span>
                          </div>
                        )}
                        {premiumBreakdown.addOnsPremium !== undefined && premiumBreakdown.addOnsPremium > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Add-ons</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.addOnsPremium)}</span>
                          </div>
                        )}
                        {premiumBreakdown.ncbDiscount !== undefined && premiumBreakdown.ncbDiscount > 0 && (
                          <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span>NCB Discount</span>
                            <span className="font-medium">-{formatCurrency(premiumBreakdown.ncbDiscount)}</span>
                          </div>
                        )}
                        {premiumBreakdown.gst !== undefined && premiumBreakdown.gst > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">GST (18%)</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(premiumBreakdown.gst)}</span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                          <div className="flex justify-between text-xl font-bold">
                            <span className="text-gray-900 dark:text-white">Total Premium</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {premium && premium > 0 ? formatCurrency(premium) : (
                                <span className="text-red-600 dark:text-red-400 text-sm font-normal">
                                  Calculation required
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to calculate premium.</p>
                      <button
                        onClick={calculatePremium}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Retry Calculation
                      </button>
                    </div>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Click "Proceed to Payment" to complete your purchase.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    disabled={loading || !premium}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

