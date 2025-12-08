# 🏛️ Claim Decision Standards: Indian Insurance Industry

## Current Implementation Summary

### Our Current Automation Rules

**Decision Flow:**
1. **Auto-Reject** if:
   - ML validation error (invalid image)
   - Policy inactive/expired
   - Severity ≥ 70%
   - Claim frequency ≥ 5 in last 12 months

2. **Auto-Approve** if:
   - Severity ≤ 30%
   - ML confidence ≥ 70%
   - No critical damage parts
   - Policy is active
   - Claim frequency < 3 in last 12 months

3. **Manual Review** if:
   - Severity between 30-70%
   - ML confidence < 70%
   - Critical damage parts detected (engine, transmission, chassis, frame, airbag, brakes)
   - Claim frequency 3-4 in last 12 months
   - ML analysis unavailable

**Current Thresholds:**
- Auto-Approve: Severity ≤ 30%
- Auto-Reject: Severity ≥ 70%
- Confidence Threshold: 70%
- High Frequency: 3+ claims/year
- Suspicious Frequency: 5+ claims/year

---

## Indian Insurance Industry Standards (IRDAI Guidelines)

### 1. **IRDAI Mandatory Requirements**

#### **Documentation Rules:**
- ✅ **Cannot reject claims solely for missing documents** (if documents were collected at policy issuance)
- ✅ Must collect all necessary documents at policy purchase
- ✅ Only request claim-specific documents during claim processing
- ✅ Cannot deny claims for irrelevant document absence

#### **Claim Settlement Timelines:**
- ⏱️ **Cashless claims**: Approval within **1 hour**
- ⏱️ **Final authorization**: Within **3 hours** of hospital discharge
- ⏱️ **Surveyor assignment**: Within 24 hours
- ⏱️ **Claim settlement**: Within 30 days (or face penalties)

#### **Rejection Requirements:**
- 🚫 **Cannot reject without Claims Review Committee approval**
- 🚫 Must provide clear reason for rejection
- 🚫 Cannot reject for policy condition breaches unrelated to the loss
- 🚫 Delayed intimation cannot be sole reason (unless delay increased loss)

### 2. **Standard Acceptance Criteria**

**Claims are ACCEPTED when:**
- ✅ Policy is active and premiums paid
- ✅ Complete disclosure at policy purchase
- ✅ Claim within policy coverage
- ✅ Adherence to waiting periods (if applicable)
- ✅ Timely intimation (within policy timeframe)
- ✅ Valid documentation provided

### 3. **Standard Rejection Criteria**

**Claims are REJECTED for:**
- ❌ **Non-disclosure/Misrepresentation**: Pre-existing conditions, false information
- ❌ **Policy Exclusions**: Explicitly excluded incidents/treatments
- ❌ **Lapsed Policy**: Inactive or unpaid premiums
- ❌ **Fraud Indicators**: Suspicious patterns, inconsistent information
- ❌ **Out of Coverage**: Not covered under policy terms
- ❌ **Delayed Intimation**: Beyond policy timeframe (only if delay increased loss)

### 4. **Manual Review Triggers**

**Claims require MANUAL REVIEW for:**
- 🔍 **High-value claims**: Above certain threshold (varies by insurer)
- 🔍 **Suspicious circumstances**: Fraud indicators, inconsistencies
- 🔍 **Complex cases**: Unclear policy applicability, intricate procedures
- 🔍 **Critical damage**: Engine, transmission, structural damage
- 🔍 **Multiple claims**: High frequency from same policyholder
- 🔍 **Low confidence**: ML/AI analysis uncertain

---

## Industry Best Practices (2024)

### **Automation Thresholds (Typical Indian Insurers)**

1. **Low-Value Claims (< ₹50,000)**
   - Auto-approve if: Clear documentation, low severity, active policy
   - Threshold: ~20-30% severity
   - Confidence: 75%+

2. **Medium-Value Claims (₹50,000 - ₹2,00,000)**
   - Auto-approve if: Severity < 25%, high confidence (80%+)
   - Manual review: Severity 25-60%
   - Auto-reject: Severity > 60% OR fraud indicators

3. **High-Value Claims (> ₹2,00,000)**
   - Always require manual review
   - Exception: Very low severity (< 15%) with 90%+ confidence

### **Fraud Detection Indicators**

Indian insurers typically flag for review:
- 🚩 **Claim frequency**: > 2-3 claims in 12 months
- 🚩 **Pattern matching**: Similar claims from same area/time
- 🚩 **Document inconsistencies**: Mismatched dates, signatures
- 🚩 **Vehicle history**: Multiple claims on same vehicle
- 🚩 **Low confidence ML**: < 60% confidence score

### **Critical Damage Parts (Always Manual Review)**

Standard parts requiring expert assessment:
- 🔧 Engine damage
- 🔧 Transmission issues
- 🔧 Chassis/Frame damage
- 🔧 Airbag deployment
- 🔧 Brake system failure
- 🔧 Structural integrity concerns

---

## Comparison: Our System vs. Industry Standards

| Criteria | Our System | Industry Standard | Status |
|----------|-----------|-------------------|--------|
| **Auto-Approve Threshold** | ≤ 30% severity | ≤ 20-30% (low value) | ✅ Aligned |
| **Auto-Reject Threshold** | ≥ 70% severity | ≥ 60% (medium value) | ⚠️ Too lenient |
| **Confidence Threshold** | 70% | 75-80% | ⚠️ Could be higher |
| **Claim Frequency Review** | 3+ claims/year | 2-3 claims/year | ⚠️ Could be stricter |
| **Critical Parts Review** | ✅ Implemented | ✅ Standard | ✅ Aligned |
| **Policy Validation** | ✅ Implemented | ✅ Required | ✅ Aligned |
| **Documentation Check** | ❌ Not implemented | ✅ IRDAI requirement | ❌ Missing |
| **Fraud Pattern Detection** | ⚠️ Basic (frequency only) | ✅ Advanced | ⚠️ Needs improvement |
| **High-Value Threshold** | ❌ Not implemented | ✅ Standard practice | ❌ Missing |
| **Vehicle Age Consideration** | ✅ Implemented | ⚠️ Varies by insurer | ✅ Good addition |

---

## Recommendations for Improvement

### 1. **Align with IRDAI Guidelines**

#### **Add Documentation Validation:**
```javascript
// Check if required documents are present
const REQUIRED_DOCUMENTS = [
  'claimForm',
  'damagePhotos',
  'policeReport', // If applicable
  'estimate' // Repair estimate
];

function validateDocuments(claim) {
  // Ensure documents were collected at policy purchase
  // Only validate claim-specific documents
  // Don't reject for missing irrelevant documents
}
```

#### **Add Claim Value Thresholds:**
```javascript
const CLAIM_VALUE_THRESHOLDS = {
  LOW_VALUE: 50000,      // ₹50,000 - Auto-approve easier
  MEDIUM_VALUE: 200000,  // ₹2,00,000 - Stricter review
  HIGH_VALUE: 500000     // ₹5,00,000 - Always manual review
};
```

### 2. **Improve Fraud Detection**

#### **Enhanced Pattern Detection:**
- Geographic clustering (multiple claims from same area)
- Time-based patterns (claims within short intervals)
- Vehicle history (multiple claims on same vehicle)
- User behavior (unusual claim patterns)

#### **Document Validation:**
- Date consistency checks
- Signature verification
- Photo metadata analysis
- Duplicate claim detection

### 3. **Adjust Thresholds**

#### **Recommended Updates:**
```javascript
const AUTOMATION_CONFIG = {
  // Severity thresholds (more aligned with industry)
  AUTO_APPROVE_MAX_SEVERITY: 25,      // Lowered from 30
  AUTO_REJECT_MIN_SEVERITY: 60,       // Lowered from 70
  
  // Confidence thresholds (higher standard)
  MIN_CONFIDENCE_FOR_AUTO_DECISION: 0.75,  // Increased from 0.7
  
  // Claim frequency (stricter)
  HIGH_FREQUENCY_CLAIMS: 2,  // Lowered from 3
  SUSPICIOUS_FREQUENCY_CLAIMS: 4,  // Lowered from 5
  
  // Claim value thresholds (new)
  LOW_VALUE_THRESHOLD: 50000,
  MEDIUM_VALUE_THRESHOLD: 200000,
  HIGH_VALUE_THRESHOLD: 500000,
  
  // Always require manual review for high-value claims
  REQUIRE_MANUAL_REVIEW_FOR_HIGH_VALUE: true
};
```

### 4. **Add IRDAI-Compliant Features**

#### **Claims Review Committee Workflow:**
- All rejections must go through review committee
- Track committee approval/rejection
- Maintain audit trail

#### **Timeline Tracking:**
- Track claim submission time
- Monitor settlement deadlines (30 days)
- Alert for approaching deadlines

#### **Transparency:**
- Clear rejection reasons
- Policyholder communication
- Appeal process

### 5. **Vehicle-Specific Considerations**

#### **Vehicle Age Adjustments (Current - Good!):**
- Older vehicles (>15 years): More lenient thresholds
- Newer vehicles (<5 years): Stricter thresholds
- Consider depreciation in payout calculation

#### **Vehicle Category:**
- Two-wheelers: Different thresholds than four-wheelers
- Commercial vehicles: Stricter review
- Luxury vehicles: Always manual review

---

## Implementation Priority

### **High Priority (IRDAI Compliance):**
1. ✅ Add documentation validation (IRDAI requirement)
2. ✅ Add claim value thresholds
3. ✅ Implement Claims Review Committee workflow for rejections
4. ✅ Add timeline tracking (30-day settlement rule)

### **Medium Priority (Best Practices):**
1. ⚠️ Adjust severity thresholds (25% approve, 60% reject)
2. ⚠️ Increase confidence threshold to 75%
3. ⚠️ Stricter claim frequency (2+ for review, 4+ for reject)
4. ⚠️ Enhanced fraud detection patterns

### **Low Priority (Enhancements):**
1. 📊 Geographic fraud detection
2. 📊 Vehicle category-specific rules
3. 📊 Advanced ML model improvements
4. 📊 Predictive analytics

---

## Conclusion

**Our current implementation is:**
- ✅ **Good foundation**: Covers basic automation needs
- ✅ **IRDAI-aligned**: Policy validation, critical parts review
- ⚠️ **Needs improvement**: Documentation validation, value thresholds, fraud detection
- ⚠️ **Thresholds**: Could be more aligned with industry standards

**Key Gaps:**
1. Missing documentation validation (IRDAI requirement)
2. No claim value-based thresholds
3. Basic fraud detection (only frequency)
4. No Claims Review Committee workflow

**Next Steps:**
1. Implement documentation validation
2. Add claim value thresholds
3. Adjust severity/confidence thresholds
4. Enhance fraud detection
5. Add IRDAI-compliant workflows

---

## References

- IRDAI Guidelines on Claim Settlement (2024)
- IRDAI Circular on Health Insurance Claims (2024)
- Industry Best Practices - Motor Insurance Claims
- ACORD Standards for Claims Management

