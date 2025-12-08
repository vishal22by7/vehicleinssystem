# 🤖 Claim Automation System

## Overview

The VIMS Claim Automation System automatically approves or rejects insurance claims based on ML (Machine Learning) analysis results, eliminating the need for manual review in most cases. The system uses intelligent decision rules to process claims efficiently while maintaining accuracy.

---

## How It Works

### 1. **Claim Submission Flow**

When a user submits a claim:

1. **Claim Created**: Status is set to `"Submitted"`
2. **ML Analysis**: Images are analyzed by the ML model
3. **Automated Decision**: The automation service evaluates the claim
4. **Status Update**: Claim status is automatically updated to:
   - `"Approved"` - Low severity, high confidence
   - `"Rejected"` - High severity or validation errors
   - `"In Review"` - Requires manual admin review

### 2. **Decision Rules**

The automation system uses the following rules (in order of priority):

#### **Rule 1: ML Validation Error**
- **Condition**: ML validation fails (e.g., not a vehicle image)
- **Decision**: `Rejected`
- **Reason**: "ML Validation Failed: [error message]"

#### **Rule 2: Policy Validity**
- **Condition**: Policy is not active or has expired
- **Decision**: `Rejected`
- **Reason**: "Policy is not active or has expired"

#### **Rule 3: ML Analysis Unavailable**
- **Condition**: ML analysis results are missing
- **Decision**: `In Review`
- **Reason**: "ML analysis not available - requires manual review"

#### **Rule 4: Low Confidence**
- **Condition**: ML confidence < 70%
- **Decision**: `In Review`
- **Reason**: "Low ML confidence - requires manual review"

#### **Rule 5: Critical Damage Parts**
- **Condition**: Damage detected in critical parts (engine, transmission, chassis, frame, airbag, brake system)
- **Decision**: `In Review`
- **Reason**: "Critical damage parts detected - requires manual review"

#### **Rule 6: Low Severity (Auto-Approve)**
- **Condition**: Severity ≤ 30 AND Confidence ≥ 70%
- **Decision**: `Approved`
- **Reason**: "Low severity damage with high confidence"

#### **Rule 7: High Severity (Auto-Reject)**
- **Condition**: Severity ≥ 70
- **Decision**: `Rejected`
- **Reason**: "High severity damage exceeds threshold"

#### **Rule 8: Medium Severity (Manual Review)**
- **Condition**: Severity between 30-70
- **Decision**: `In Review`
- **Reason**: "Medium severity damage requires manual assessment"

---

## Configuration

Automation thresholds can be configured in `backend/services/claimAutomation.js`:

```javascript
const AUTOMATION_CONFIG = {
  AUTO_APPROVE_MAX_SEVERITY: 30,      // Auto-approve if severity <= 30
  AUTO_REJECT_MIN_SEVERITY: 70,       // Auto-reject if severity >= 70
  MIN_CONFIDENCE_FOR_AUTO_DECISION: 0.7,  // Need at least 70% confidence
  CRITICAL_DAMAGE_PARTS: ['engine', 'transmission', 'chassis', ...],
  ENABLED: true,  // Enable/disable automation
  REQUIRE_ACTIVE_POLICY: true
};
```

Or via environment variable:
```env
CLAIM_AUTOMATION_ENABLED=true
```

---

## Database Fields

The following fields are added to the `claims` table:

- `autoDecision` (boolean): Whether the decision was automated
- `autoDecisionReason` (text): Reason for the automated decision
- `autoDecisionAt` (timestamp): When the decision was made
- `autoDecisionConfidence` (decimal): Confidence score of the decision

---

## Admin Override

Admins can still manually review and override automated decisions:

1. **View Claims**: Go to `/admin/claims`
2. **Identify Automated Claims**: Look for the "🤖 Auto" badge
3. **Override Decision**: Click "Mark as Approved" or "Mark as Rejected"
4. **Audit Trail**: The system records that the decision was manually overridden

When an admin overrides an automated decision:
- `autoDecision` is set to `false`
- `autoDecisionReason` is updated to include the override information
- Original automated reason is preserved in the reason field

---

## Payout Calculation

When a claim is automatically approved:

- **Payout Amount**: Calculated based on severity and policy premium
  - High severity (≥60): Up to 90% of premium
  - Medium severity (40-59): 30-60% of premium
  - Low severity (<40): 10-30% of premium
- **Payout Status**: Set to `"Approved"` if payout > 0
- **Verified**: Set to `true`

---

## Setup Instructions

### 1. Run Database Migration

Add the automation fields to your database:

```bash
cd backend
node scripts/add-claim-automation-fields.js
```

### 2. Verify Configuration

Check that automation is enabled in `backend/services/claimAutomation.js`:

```javascript
ENABLED: process.env.CLAIM_AUTOMATION_ENABLED !== 'false'
```

### 3. Test the System

1. Submit a test claim with low severity damage
2. Check that it's automatically approved
3. Submit a test claim with high severity damage
4. Check that it's automatically rejected or sent for review

---

## Monitoring & Logging

The automation system logs all decisions:

```
🤖 Automated Decision Applied:
   Claim ID: [uuid]
   Decision: Approved/Rejected/In Review
   Reason: [reason]
   Confidence: [percentage]%
   Requires Review: Yes/No
```

Check backend logs to monitor automation performance.

---

## Additional Information Needed

To improve automation accuracy, consider collecting:

1. **Claim History**: Track user's previous claim frequency
2. **Vehicle Age**: Older vehicles may have different thresholds
3. **Policy Type**: Different policy types may require different rules
4. **Geographic Data**: Location-based risk factors
5. **Time of Incident**: Time-based patterns (e.g., night accidents)

These can be added to the automation rules as needed.

---

## Troubleshooting

### Automation Not Working

1. **Check if enabled**: Verify `CLAIM_AUTOMATION_ENABLED` is not `false`
2. **Check ML Analysis**: Ensure ML analysis is completing successfully
3. **Check Database**: Verify automation fields exist in the database
4. **Check Logs**: Review backend logs for automation errors

### Too Many Manual Reviews

1. **Adjust Thresholds**: Lower `AUTO_APPROVE_MAX_SEVERITY` or raise `AUTO_REJECT_MIN_SEVERITY`
2. **Improve ML Confidence**: Work on improving ML model accuracy
3. **Review Critical Parts List**: Adjust which parts require manual review

### Too Many Auto-Rejections

1. **Raise Threshold**: Increase `AUTO_REJECT_MIN_SEVERITY`
2. **Review Validation Rules**: Check if validation is too strict

---

## Future Enhancements

Potential improvements:

1. **Machine Learning Model**: Train a model specifically for claim approval/rejection
2. **User Behavior Analysis**: Track patterns in user claims
3. **Fraud Detection**: Integrate fraud detection algorithms
4. **Dynamic Thresholds**: Adjust thresholds based on historical data
5. **Multi-Factor Analysis**: Combine ML results with other data sources

---

## Support

For issues or questions about the automation system, check:
- Backend logs: `backend/logs/` (if logging is configured)
- Database: Check `claims` table for `autoDecision` fields
- Configuration: `backend/services/claimAutomation.js`

