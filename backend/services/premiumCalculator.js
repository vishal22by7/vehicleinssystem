/**
 * Premium Calculator Service for Indian Insurance
 * Implements IRDAI rates, NCB, IDV calculations
 */

// IRDAI Third-Party Premium Rates (Fixed by IRDAI)
// These are example rates - actual rates should be updated from IRDAI circulars
const IRDAI_TP_RATES = {
  '2W': {
    '<75cc': 482,
    '75-150cc': 752,
    '150-350cc': 1193,
    '>350cc': 2323
  },
  '4W': {
    '<1000cc': 2094,
    '1000-1500cc': 3423,
    '1500-2000cc': 7890,
    '>2000cc': 12872
  },
  'Commercial': {
    'GVW<7500kg': 5858,
    'GVW7500-12000kg': 14316,
    'GVW>12000kg': 29041
  }
};

// Personal Accident (Owner-Driver) Cover
const PA_COVER = 375;

// GST Rate
const GST_RATE = 0.18; // 18%

// Depreciation Table for IDV Calculation
const DEPRECIATION_TABLE = [
  { age: 0, months: 6, rate: 0.05 },   // < 6 months: 5%
  { age: 0, months: 12, rate: 0.15 },   // 6-12 months: 15%
  { age: 1, months: 24, rate: 0.20 },   // 1-2 years: 20%
  { age: 2, months: 36, rate: 0.30 },   // 2-3 years: 30%
  { age: 3, months: 48, rate: 0.40 },   // 3-4 years: 40%
  { age: 4, months: 60, rate: 0.50 }    // 4-5 years: 50%
];

// NCB Slabs
const NCB_SLABS = {
  0: 0,
  1: 20,
  2: 25,
  3: 35,
  4: 45,
  5: 50
};

// Add-on Premium Multipliers (percentage of OD premium)
const ADDON_MULTIPLIERS = {
  zeroDepreciation: 0.15,      // 15% of OD premium
  engineProtector: 0.05,        // 5% of OD premium
  returnToInvoice: 0.10,        // 10% of OD premium
  ncbProtector: 0.02,            // 2% of OD premium
  roadsideAssistance: 0.01,      // 1% of OD premium
  keyLockCover: 0.01,            // 1% of OD premium
  tyreProtection: 0.02,          // 2% of OD premium
  consumablesCover: 0.01         // 1% of OD premium
};

/**
 * Calculate IDV (Insured Declared Value)
 */
function calculateIDV(exShowroomPrice, yearOfManufacture, registrationDate) {
  const now = new Date();
  const regDate = new Date(registrationDate);
  const yearsSinceReg = now.getFullYear() - regDate.getFullYear();
  const monthsSinceReg = (now.getMonth() - regDate.getMonth()) + (yearsSinceReg * 12);
  
  let depreciationRate = 0;
  
  // Find applicable depreciation rate
  for (const dep of DEPRECIATION_TABLE) {
    const ageInMonths = (now.getFullYear() - yearOfManufacture) * 12 + (now.getMonth() - 0);
    if (ageInMonths < dep.months) {
      depreciationRate = dep.rate;
      break;
    }
  }
  
  // If vehicle is older than 5 years, use market value (mutually agreed)
  if (yearsSinceReg >= 5) {
    // For vehicles older than 5 years, IDV is typically 50% of ex-showroom
    depreciationRate = 0.50;
  }
  
  const idv = exShowroomPrice * (1 - depreciationRate);
  return Math.round(idv);
}

/**
 * Get IRDAI TP Premium based on vehicle category and engine capacity
 */
function getIRDATPPremium(vehicleCategory, engineCapacity) {
  const category = vehicleCategory === '2W' ? '2W' : vehicleCategory === '4W' ? '4W' : 'Commercial';
  const rates = IRDAI_TP_RATES[category];
  
  if (!rates) {
    return 0;
  }
  
  // Determine capacity bracket
  if (category === '2W') {
    if (engineCapacity < 75) return rates['<75cc'];
    if (engineCapacity < 150) return rates['75-150cc'];
    if (engineCapacity < 350) return rates['150-350cc'];
    return rates['>350cc'];
  } else if (category === '4W') {
    if (engineCapacity < 1000) return rates['<1000cc'];
    if (engineCapacity < 1500) return rates['1000-1500cc'];
    if (engineCapacity < 2000) return rates['1500-2000cc'];
    return rates['>2000cc'];
  } else {
    // Commercial - simplified
    return rates['GVW<7500kg'];
  }
}

/**
 * Calculate Own Damage Premium
 */
function calculateODPremium(idv, vehicleAge, vehicleCategory, odRate) {
  // OD Rate is typically 2-4% of IDV depending on vehicle category
  // Use vehicleCategory (2W, 4W) instead of vehicleType (make/model)
  const isTwoWheeler = vehicleCategory === '2W' || (vehicleCategory && vehicleCategory.toLowerCase().includes('2w'));
  const baseODRate = odRate || (isTwoWheeler ? 0.025 : 0.03);
  let odPremium = idv * baseODRate;
  
  // Apply age factor (older vehicles have higher rates)
  if (vehicleAge > 5) {
    odPremium *= 1.2;
  } else if (vehicleAge > 3) {
    odPremium *= 1.1;
  }
  
  return Math.round(odPremium);
}

/**
 * Calculate NCB Discount
 */
function calculateNCBDiscount(odPremium, ncbPercentage) {
  if (!ncbPercentage || ncbPercentage === 0) {
    return 0;
  }
  return Math.round(odPremium * (ncbPercentage / 100));
}

/**
 * Calculate Add-ons Premium
 */
function calculateAddOnsPremium(odPremium, addOns) {
  let totalAddOnsPremium = 0;
  const addOnCosts = {};
  
  addOns.forEach(addOn => {
    if (ADDON_MULTIPLIERS[addOn]) {
      const cost = Math.round(odPremium * ADDON_MULTIPLIERS[addOn]);
      addOnCosts[addOn] = cost;
      totalAddOnsPremium += cost;
    }
  });
  
  return { totalAddOnsPremium, addOnCosts };
}

/**
 * Main Premium Calculation Function
 */
function calculatePremium(data) {
  const {
    vehicleCategory,
    policyType,
    engineCapacity,
    yearOfManufacture,
    registrationDate,
    exShowroomPrice,
    previousNCB = 0,
    addOns = [],
    vehicleType = 'Car'
  } = data;
  
  const breakdown = {
    basePremium: 0,
    tpPremium: 0,
    odPremium: 0,
    addOnsPremium: 0,
    ncbDiscount: 0,
    gst: 0,
    finalPremium: 0
  };
  
  // Calculate IDV
  const idv = exShowroomPrice ? calculateIDV(exShowroomPrice, yearOfManufacture, registrationDate) : null;
  const vehicleAge = new Date().getFullYear() - yearOfManufacture;
  
  // Normalize policy type name for matching (case-insensitive)
  const policyTypeLower = (policyType || '').toLowerCase();
  
  // Calculate TP Premium (if required)
  // Check if policy type contains "TP", "Third-Party", or "Comprehensive"
  const isTPPolicy = policyTypeLower.includes('tp') || 
                     policyTypeLower.includes('third-party') || 
                     policyTypeLower.includes('third party') ||
                     policyTypeLower.includes('comprehensive');
  
  if (isTPPolicy) {
    breakdown.tpPremium = getIRDATPPremium(vehicleCategory, engineCapacity);
    breakdown.tpPremium += PA_COVER; // Add PA cover
    console.log('✅ TP Premium calculated:', breakdown.tpPremium);
  }
  
  // Calculate OD Premium (if required)
  // Check if policy type contains "OD", "Own Damage", or "Comprehensive"
  const isODPolicy = policyTypeLower.includes('od') || 
                     policyTypeLower.includes('own damage') ||
                     policyTypeLower.includes('comprehensive') ||
                     policyTypeLower.includes('standalone') ||
                     policyTypeLower.includes('stand-alone');
  
  console.log('📋 OD Policy check:', { isODPolicy, policyTypeLower, hasIdv: !!idv });
  
  if (isODPolicy) {
    if (idv) {
      // Pass vehicleCategory instead of vehicleType for proper 2W/4W detection
      breakdown.odPremium = calculateODPremium(idv, vehicleAge, vehicleCategory);
      console.log('✅ OD Premium (before NCB):', breakdown.odPremium);
      
      // Apply NCB discount
      breakdown.ncbDiscount = calculateNCBDiscount(breakdown.odPremium, previousNCB);
      breakdown.odPremium -= breakdown.ncbDiscount;
      console.log('✅ OD Premium (after NCB):', breakdown.odPremium, 'NCB Discount:', breakdown.ncbDiscount);
      
      // Calculate add-ons premium
      const addOnsResult = calculateAddOnsPremium(breakdown.odPremium, addOns);
      breakdown.addOnsPremium = addOnsResult.totalAddOnsPremium;
      console.log('✅ Add-ons Premium:', breakdown.addOnsPremium);
    } else {
      console.warn('⚠️  IDV is null, cannot calculate OD premium');
    }
  }
  
  // Calculate base premium (sum of TP and OD before GST)
  breakdown.basePremium = breakdown.tpPremium + breakdown.odPremium + breakdown.addOnsPremium;
  
  // Calculate GST
  breakdown.gst = Math.round(breakdown.basePremium * GST_RATE);
  
  // Final Premium
  breakdown.finalPremium = breakdown.basePremium + breakdown.gst;
  
  return {
    idv,
    breakdown,
    ncbPercentage: previousNCB
  };
}

module.exports = {
  calculatePremium,
  calculateIDV,
  getIRDATPPremium,
  calculateODPremium,
  calculateNCBDiscount,
  calculateAddOnsPremium,
  DEPRECIATION_TABLE,
  NCB_SLABS,
  IRDAI_TP_RATES
};

