# 🚀 Implementation Plan: IRDAI-Compliant Claim Automation

## Overview
This document outlines all the improvements that will be implemented to align our claim automation system with Indian insurance industry standards (IRDAI guidelines).

---

## 📋 What Will Be Implemented

### 1. **Updated Automation Thresholds** ⚙️
**Current → New:**
- Auto-Approve Severity: `30%` → `25%` (more aligned with industry)
- Auto-Reject Severity: `70%` → `60%` (stricter, catches more high-severity cases)
- Confidence Threshold: `70%` → `75%` (higher standard)
- High Frequency Claims: `3+` → `2+` claims/year (stricter fraud detection)
- Suspicious Frequency: `5+` → `4+` claims/year (earlier flagging)

**Files to Update:**
- `backend/services/claimAutomation.js` - Update `AUTOMATION_CONFIG`

---

### 2. **Claim Value Thresholds** 💰
**New Feature:** Different automation rules based on claim value

**Value Categories:**
- **Low Value**: < ₹50,000
  - Auto-approve: Severity ≤ 25%, Confidence ≥ 75%
  - More lenient thresholds
  
- **Medium Value**: ₹50,000 - ₹2,00,000
  - Auto-approve: Severity ≤ 20%, Confidence ≥ 80%
  - Stricter review for medium severity
  
- **High Value**: > ₹2,00,000
  - Always requires manual review
  - Exception: Very low severity (< 15%) with 90%+ confidence

**Implementation:**
- Calculate claim value from policy premium and severity
- Add value-based decision logic
- Store claim value category in decision reason

**Files to Update:**
- `backend/services/claimAutomation.js` - Add value calculation and thresholds
- `backend/models/sequelize/Claim.js` - Add `claimValueCategory` field (optional, can be derived)

---

### 3. **Documentation Validation** 📄
**IRDAI Requirement:** Cannot reject claims solely for missing documents

**Required Documents (at claim submission):**
- ✅ Damage photos (already required)
- ✅ Claim description (already required)
- ⚠️ Police report (if applicable - major accidents)
- ⚠️ Repair estimate (optional but recommended)

**Documentation Rules:**
- Check if documents were collected at policy purchase
- Only validate claim-specific documents
- Don't reject for missing irrelevant documents
- Flag missing critical documents for manual review (not auto-reject)

**Implementation:**
- Add document validation function
- Check document completeness
- Flag incomplete documentation (send to review, not reject)
- Track document status

**Files to Update:**
- `backend/services/claimAutomation.js` - Add `validateDocuments()` function
- `backend/routes/claims.js` - Add document validation in submission
- `backend/models/sequelize/Claim.js` - Add `documentsStatus` field (optional)

---

### 4. **Enhanced Fraud Detection** 🚨
**Current:** Only checks claim frequency

**New Features:**
- **Geographic Clustering**: Multiple claims from same area
- **Time Pattern Detection**: Claims within short intervals
- **Vehicle History**: Multiple claims on same vehicle
- **User Behavior**: Unusual claim patterns
- **Document Consistency**: Date/signature validation

**Implementation:**
- Add fraud detection service
- Check geographic patterns (if location data available)
- Check time-based patterns (claims within X days)
- Check vehicle claim history
- Enhanced user claim history analysis

**Files to Create/Update:**
- `backend/services/fraudDetection.js` - New service for fraud detection
- `backend/services/claimAutomation.js` - Integrate fraud detection
- `backend/models/sequelize/Claim.js` - Add `fraudScore` and `fraudFlags` fields

---

### 5. **Claims Review Committee Workflow** 👥
**IRDAI Requirement:** All rejections must go through Claims Review Committee

**Implementation:**
- Track if rejection needs committee approval
- Add `committeeApprovalRequired` flag
- Add `committeeApproved` status
- Add `committeeApprovedAt` timestamp
- Add `committeeApprovedBy` (admin ID)
- Prevent final rejection without committee approval (for auto-rejections)

**Workflow:**
1. Auto-rejection → Set status to "Pending Committee Review"
2. Committee reviews → Approves/Rejects
3. Final status updated after committee decision

**Files to Update:**
- `backend/models/sequelize/Claim.js` - Add committee fields
- `backend/services/claimAutomation.js` - Update rejection logic
- `backend/routes/admin.js` - Add committee approval endpoints
- `frontend/app/admin/claims/page.tsx` - Add committee approval UI

---

### 6. **Timeline Tracking** ⏱️
**IRDAI Requirement:** 30-day claim settlement deadline

**Features:**
- Track claim submission date
- Calculate days since submission
- Alert when approaching 30-day deadline
- Track settlement timeline
- Generate reports for overdue claims

**Implementation:**
- Add `submittedAt` tracking (already exists)
- Add `settlementDeadline` calculation
- Add `daysSinceSubmission` helper
- Add alerts for approaching deadlines
- Add dashboard for overdue claims

**Files to Update:**
- `backend/services/claimAutomation.js` - Add timeline helpers
- `backend/routes/admin.js` - Add deadline tracking endpoints
- `frontend/app/admin/claims/page.tsx` - Show deadline warnings
- `backend/models/sequelize/Claim.js` - Add `settlementDeadline` field (optional, can be calculated)

---

### 7. **Vehicle Category Considerations** 🚗
**Enhancement:** Different rules for different vehicle types

**Categories:**
- **Two-Wheelers**: More lenient thresholds (lower severity for approval)
- **Four-Wheelers**: Standard thresholds
- **Commercial Vehicles**: Stricter review
- **Luxury Vehicles**: Always manual review

**Implementation:**
- Check vehicle category from policy
- Apply category-specific thresholds
- Adjust severity thresholds based on category

**Files to Update:**
- `backend/services/claimAutomation.js` - Add vehicle category logic
- `backend/models/sequelize/Policy.js` - Check if vehicle category is stored

---

## 📁 Files That Will Be Modified

### Backend Files:
1. **`backend/services/claimAutomation.js`**
   - Update thresholds
   - Add claim value calculation
   - Add documentation validation
   - Integrate fraud detection
   - Add vehicle category logic
   - Add timeline helpers

2. **`backend/models/sequelize/Claim.js`**
   - Add `claimValueCategory` (optional)
   - Add `documentsStatus` (optional)
   - Add `fraudScore` and `fraudFlags`
   - Add committee approval fields
   - Add `settlementDeadline` (optional)

3. **`backend/routes/claims.js`**
   - Add document validation in submission
   - Integrate fraud detection

4. **`backend/routes/admin.js`**
   - Add committee approval endpoints
   - Add deadline tracking endpoints

5. **`backend/services/fraudDetection.js`** (NEW)
   - Geographic pattern detection
   - Time-based pattern detection
   - Vehicle history analysis
   - User behavior analysis

### Frontend Files:
1. **`frontend/app/admin/claims/page.tsx`**
   - Add committee approval UI
   - Show deadline warnings
   - Display fraud flags
   - Show claim value category

2. **`frontend/app/submit-claim/page.tsx`** (Optional)
   - Show document requirements
   - Display timeline information

---

## 🗄️ Database Changes

### New Fields in `claims` Table:
```sql
-- Optional fields (can be calculated, but storing for performance)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_value_category VARCHAR(20); -- 'low', 'medium', 'high'
ALTER TABLE claims ADD COLUMN IF NOT EXISTS documents_status VARCHAR(20); -- 'complete', 'incomplete', 'pending'
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fraud_score DECIMAL(5,2); -- 0-100
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fraud_flags JSONB; -- Array of fraud indicators
ALTER TABLE claims ADD COLUMN IF NOT EXISTS committee_approval_required BOOLEAN DEFAULT false;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS committee_approved BOOLEAN DEFAULT false;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS committee_approved_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS committee_approved_by UUID REFERENCES users(id);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS settlement_deadline DATE; -- Calculated: submittedAt + 30 days
```

---

## 🔄 Implementation Order

### Phase 1: Core Threshold Updates (Quick Wins)
1. ✅ Update automation thresholds
2. ✅ Add claim value calculation
3. ✅ Add vehicle category logic

### Phase 2: IRDAI Compliance (Critical)
4. ✅ Add documentation validation
5. ✅ Add Claims Review Committee workflow
6. ✅ Add timeline tracking

### Phase 3: Enhanced Features (Advanced)
7. ✅ Create fraud detection service
8. ✅ Integrate fraud detection
9. ✅ Add frontend UI updates

---

## 📊 Expected Impact

### Before:
- Auto-approve: 30% severity threshold
- Auto-reject: 70% severity threshold
- Basic fraud detection (frequency only)
- No documentation validation
- No committee workflow

### After:
- Auto-approve: 25% severity (stricter)
- Auto-reject: 60% severity (catches more)
- Enhanced fraud detection (multiple patterns)
- IRDAI-compliant documentation validation
- Committee approval workflow
- Timeline tracking and alerts

---

## ⚠️ Breaking Changes

### None Expected:
- All changes are backward compatible
- Existing claims will continue to work
- New fields are optional (can be calculated)
- Old automation logic still works, just enhanced

### Migration Required:
- Database migration for new fields (optional fields)
- No data loss expected
- Can run migration script or let Sequelize handle it

---

## 🧪 Testing Checklist

After implementation, test:
- [ ] Low-value claim auto-approval (< ₹50K, severity ≤ 25%)
- [ ] Medium-value claim review (₹50K-₹2L, severity 20-60%)
- [ ] High-value claim always goes to review (> ₹2L)
- [ ] Documentation validation (missing docs → review, not reject)
- [ ] Fraud detection (high frequency → review/reject)
- [ ] Committee approval workflow (rejection → committee → final)
- [ ] Timeline tracking (30-day deadline calculation)
- [ ] Vehicle category logic (two-wheeler vs four-wheeler)

---

## 📝 Notes

- All new fields are optional and can be calculated on-the-fly
- Backward compatibility maintained
- Can be enabled/disabled via configuration
- Follows IRDAI guidelines for Indian insurance market
- Industry-standard thresholds based on research

---

## 🚀 Ready to Implement?

This plan covers all improvements from `CLAIM_DECISION_STANDARDS.md`. Implementation will be done in phases to ensure stability and testing at each step.

