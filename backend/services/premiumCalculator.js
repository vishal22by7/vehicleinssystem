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
function calculateIDV(exShowroomPrice, yearOfRegistration, registrationDate) {
  const now = new Date();
  const regDate = new Date(registrationDate);
  const regYear = regDate.getFullYear();
  const yearsSinceReg = now.getFullYear() - regYear;
  
  // Calculate age in months from registration date (not manufacture date)
  // Insurance age is calculated from registration date as per IRDAI guidelines
  const monthsSinceReg = (now.getFullYear() - regYear) * 12 + (now.getMonth() - regDate.getMonth());
  
  let depreciationRate = 0;
  
  // Find applicable depreciation rate based on registration date
  for (const dep of DEPRECIATION_TABLE) {
    if (monthsSinceReg < dep.months) {
      depreciationRate = dep.rate;
      break;
    }
  }
  
  // If vehicle is older than 5 years from registration, use market value (mutually agreed)
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
    yearOfRegistration,
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
  
  // Vehicle age for insurance purposes is calculated from registration date, not manufacture date
  const regDate = registrationDate ? new Date(registrationDate) : new Date();
  const vehicleAge = new Date().getFullYear() - regDate.getFullYear();
  
  // Normalize policy type name for matching (case-insensitive)
  const policyTypeLower = (policyType || '').toLowerCase().trim();
  
  // Default exShowroomPrice if not provided (based on vehicle category)
  const defaultExShowroomPrice = vehicleCategory === '2W' ? 100000 : 500000;
  const effectiveExShowroomPrice = exShowroomPrice || defaultExShowroomPrice;
  
  // Calculate IDV - always calculate even with default price
  const idv = calculateIDV(effectiveExShowroomPrice, yearOfRegistration, registrationDate);
  
  console.log('📊 Premium Calculation Input:', {
    vehicleCategory,
    policyType: policyTypeLower,
    engineCapacity,
    exShowroomPrice: effectiveExShowroomPrice,
    idv,
    vehicleAge,
    previousNCB
  });
  
  // Comprehensive policy type matching - handle all variations
  // Check for Third-Party (TP) component - any policy that includes TP coverage
  const tpKeywords = [
    'tp', 'third-party', 'third party', 'thirdparty',
    'comprehensive', 'comprehensive private car', 'comprehensive car',
    'two-wheeler third-party', 'two wheeler third party',
    'third-party liability', 'third party liability',
    'long-term tp', 'long term tp'
  ];
  let isTPPolicy = tpKeywords.some(keyword => policyTypeLower.includes(keyword));
  
  // Check for Own Damage (OD) component - any policy that includes OD coverage
  const odKeywords = [
    'od', 'own damage', 'owndamage', 'own-damage',
    'comprehensive', 'comprehensive private car', 'comprehensive car',
    'standalone', 'stand-alone', 'stand alone',
    'zero-depreciation', 'zero depreciation', 'zero depreciation premium',
    'electric vehicle', 'electric vehicle comprehensive',
    'two-wheeler comprehensive', 'two wheeler comprehensive',
    'comprehensive private car'
  ];
  let isODPolicy = odKeywords.some(keyword => policyTypeLower.includes(keyword));
  
  // If policy type is empty or unrecognized, default to comprehensive
  if (!policyTypeLower || policyTypeLower === '') {
    console.warn('⚠️  Policy type is empty, defaulting to Comprehensive');
    isTPPolicy = true;
    isODPolicy = true;
  }
  
  console.log('📋 Policy Type Analysis:', { 
    isTPPolicy, 
    isODPolicy, 
    policyTypeLower,
    willCalculateTP: isTPPolicy,
    willCalculateOD: isODPolicy && !!idv
  });
  
  // Calculate TP Premium (if required)
  if (isTPPolicy) {
    breakdown.tpPremium = getIRDATPPremium(vehicleCategory, engineCapacity);
    breakdown.tpPremium += PA_COVER; // Add PA cover
    console.log('✅ TP Premium calculated:', breakdown.tpPremium);
  }
  
  // Calculate OD Premium (if required)
  if (isODPolicy) {
    if (idv && idv > 0) {
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
      console.warn('⚠️  IDV is invalid or zero, cannot calculate OD premium. IDV:', idv);
      // If IDV is invalid but we need OD, use a fallback calculation
      if (isODPolicy && !isTPPolicy) {
        // For OD-only policies, we need some premium, so use a fallback
        const fallbackIDV = effectiveExShowroomPrice * 0.8; // 80% of ex-showroom as fallback
        breakdown.odPremium = calculateODPremium(fallbackIDV, vehicleAge, vehicleCategory);
        breakdown.ncbDiscount = calculateNCBDiscount(breakdown.odPremium, previousNCB);
        breakdown.odPremium -= breakdown.ncbDiscount;
        console.log('⚠️  Using fallback IDV for OD calculation:', fallbackIDV);
      }
    }
  }
  
  // If neither TP nor OD was calculated, this is an error
  if (!isTPPolicy && !isODPolicy) {
    console.error('❌ Unknown policy type:', policyType);
    // Default to comprehensive if policy type is unrecognized
    breakdown.tpPremium = getIRDATPPremium(vehicleCategory, engineCapacity) + PA_COVER;
    if (idv && idv > 0) {
      breakdown.odPremium = calculateODPremium(idv, vehicleAge, vehicleCategory);
      breakdown.ncbDiscount = calculateNCBDiscount(breakdown.odPremium, previousNCB);
      breakdown.odPremium -= breakdown.ncbDiscount;
    }
    console.log('⚠️  Defaulted to Comprehensive policy calculation');
  }
  
  // Calculate base premium (sum of TP and OD before GST)
  breakdown.basePremium = breakdown.tpPremium + breakdown.odPremium + breakdown.addOnsPremium;
  
  // Ensure we have at least some premium calculated
  if (breakdown.basePremium === 0) {
    console.error('❌ ERROR: Total premium is zero!', {
      tpPremium: breakdown.tpPremium,
      odPremium: breakdown.odPremium,
      addOnsPremium: breakdown.addOnsPremium,
      isTPPolicy,
      isODPolicy,
      idv,
      policyTypeLower
    });
    // Fallback: Calculate minimum premium based on vehicle category
    breakdown.tpPremium = getIRDATPPremium(vehicleCategory, engineCapacity) + PA_COVER;
    if (idv && idv > 0) {
      breakdown.odPremium = calculateODPremium(idv, vehicleAge, vehicleCategory);
      breakdown.ncbDiscount = calculateNCBDiscount(breakdown.odPremium, previousNCB);
      breakdown.odPremium -= breakdown.ncbDiscount;
    }
    breakdown.basePremium = breakdown.tpPremium + breakdown.odPremium + breakdown.addOnsPremium;
    console.log('⚠️  Applied fallback calculation. New base premium:', breakdown.basePremium);
  }
  
  // Calculate GST
  breakdown.gst = Math.round(breakdown.basePremium * GST_RATE);
  
  // Final Premium
  breakdown.finalPremium = breakdown.basePremium + breakdown.gst;
  
  // Final validation - ensure final premium is not zero
  if (breakdown.finalPremium === 0) {
    console.error('❌ CRITICAL: Final premium is still zero after all calculations!');
    // Emergency fallback: minimum premium based on vehicle category
    const minPremium = vehicleCategory === '2W' ? 2000 : 5000;
    breakdown.tpPremium = minPremium;
    breakdown.basePremium = minPremium;
    breakdown.gst = Math.round(minPremium * GST_RATE);
    breakdown.finalPremium = breakdown.basePremium + breakdown.gst;
    console.log('⚠️  Applied emergency minimum premium:', breakdown.finalPremium);
  }
  
  console.log('💰 Final Premium Breakdown:', {
    tpPremium: breakdown.tpPremium,
    odPremium: breakdown.odPremium,
    addOnsPremium: breakdown.addOnsPremium,
    ncbDiscount: breakdown.ncbDiscount,
    basePremium: breakdown.basePremium,
    gst: breakdown.gst,
    finalPremium: breakdown.finalPremium
  });
  
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

