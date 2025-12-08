/**
 * Claim Automation Service
 * Automatically approves or rejects claims based on ML analysis results
 */

const { Claim, Policy, User } = require('../models/sequelize');
const blockchainService = require('./blockchain');
const { BlockchainRecord } = require('../models/sequelize');

// Configuration - can be moved to environment variables or database
const AUTOMATION_CONFIG = {
  // Severity thresholds (0-100)
  AUTO_APPROVE_MAX_SEVERITY: 30,      // Auto-approve if severity <= 30
  AUTO_REJECT_MIN_SEVERITY: 70,       // Auto-reject if severity >= 70
  // Between 30-70: Requires manual review (In Review)
  
  // Confidence thresholds (0-1)
  MIN_CONFIDENCE_FOR_AUTO_DECISION: 0.7,  // Need at least 70% confidence for auto-decision
  
  // Critical damage parts that require manual review
  CRITICAL_DAMAGE_PARTS: [
    'engine',
    'transmission',
    'chassis',
    'frame',
    'airbag',
    'brake system'
  ],
  
  // Enable/disable automation
  ENABLED: process.env.CLAIM_AUTOMATION_ENABLED !== 'false', // Default: enabled
  
  // Policy validation
  REQUIRE_ACTIVE_POLICY: true,  // Claim must have active policy
  
  // Vehicle age thresholds (in years)
  OLD_VEHICLE_THRESHOLD: 10,  // Vehicles older than 10 years
  VERY_OLD_VEHICLE_THRESHOLD: 15,  // Vehicles older than 15 years
  
  // Claim history thresholds
  HIGH_FREQUENCY_CLAIMS: 3,  // More than 3 claims in last 12 months requires review
  SUSPICIOUS_FREQUENCY_CLAIMS: 5,  // More than 5 claims in last 12 months - auto reject
};

/**
 * Check if policy is active
 */
async function isPolicyActive(policy) {
  if (!policy) return false;
  
  const now = new Date();
  const startDate = new Date(policy.startDate);
  const endDate = new Date(policy.endDate);
  
  return startDate <= now && endDate >= now && policy.status !== 'Cancelled';
}

/**
 * Check if damage parts are critical
 */
function hasCriticalDamage(damageParts) {
  if (!damageParts || !Array.isArray(damageParts) || damageParts.length === 0) {
    return false;
  }
  
  const lowerDamageParts = damageParts.map(part => part.toLowerCase());
  return AUTOMATION_CONFIG.CRITICAL_DAMAGE_PARTS.some(critical => 
    lowerDamageParts.some(part => part.includes(critical.toLowerCase()))
  );
}

/**
 * Calculate vehicle age in years
 */
function getVehicleAge(policy) {
  if (!policy || !policy.yearOfManufacture) {
    return null;
  }
  
  const currentYear = new Date().getFullYear();
  return currentYear - policy.yearOfManufacture;
}

/**
 * Get user's claim history (number of claims in last 12 months)
 */
async function getUserClaimHistory(userId) {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const claimCount = await Claim.count({
      where: {
        userId: userId,
        submittedAt: {
          [require('sequelize').Op.gte]: twelveMonthsAgo
        }
      }
    });
    
    return claimCount;
  } catch (error) {
    console.error('Error getting user claim history:', error);
    return 0;
  }
}

/**
 * Automatically decide claim status based on ML analysis
 * @param {Object} claim - The claim object with ML analysis results
 * @param {Object} policy - The associated policy object
 * @param {Object} user - The user object (optional, for claim history)
 * @returns {Object} Decision object with status, reason, and confidence
 */
async function autoDecideClaim(claim, policy, user = null) {
  // Check if automation is enabled
  if (!AUTOMATION_CONFIG.ENABLED) {
    return {
      decision: null,
      reason: 'Automation is disabled',
      confidence: 0
    };
  }

  // Rule 1: ML Validation Error - Auto Reject
  if (claim.mlValidationError) {
    return {
      decision: 'Rejected',
      reason: `ML Validation Failed: ${claim.mlValidationError}`,
      confidence: 1.0,
      requiresReview: false
    };
  }

  // Rule 2: Check if policy is active
  if (AUTOMATION_CONFIG.REQUIRE_ACTIVE_POLICY && !isPolicyActive(policy)) {
    return {
      decision: 'Rejected',
      reason: 'Policy is not active or has expired',
      confidence: 1.0,
      requiresReview: false
    };
  }

  // Rule 2.5: Check user claim history (suspicious frequency)
  if (user && claim.userId) {
    const claimHistory = await getUserClaimHistory(claim.userId);
    if (claimHistory >= AUTOMATION_CONFIG.SUSPICIOUS_FREQUENCY_CLAIMS) {
      return {
        decision: 'Rejected',
        reason: `Suspicious claim frequency: ${claimHistory} claims in last 12 months`,
        confidence: 0.9,
        requiresReview: false
      };
    }
    if (claimHistory >= AUTOMATION_CONFIG.HIGH_FREQUENCY_CLAIMS) {
      return {
        decision: 'In Review',
        reason: `High claim frequency: ${claimHistory} claims in last 12 months - requires manual review`,
        confidence: 0.7,
        requiresReview: true
      };
    }
  }

  // Rule 3: If ML analysis is not available, require manual review
  if (claim.mlSeverity === null || claim.mlSeverity === undefined) {
    return {
      decision: 'In Review',
      reason: 'ML analysis not available - requires manual review',
      confidence: 0,
      requiresReview: true
    };
  }

  const severity = claim.mlSeverity;
  const confidence = claim.mlConfidence || 0;
  const damageParts = claim.damageParts || [];

  // Rule 4: Check confidence threshold
  if (confidence < AUTOMATION_CONFIG.MIN_CONFIDENCE_FOR_AUTO_DECISION) {
    return {
      decision: 'In Review',
      reason: `Low ML confidence (${(confidence * 100).toFixed(1)}%) - requires manual review`,
      confidence: confidence,
      requiresReview: true
    };
  }

  // Rule 5: Critical damage parts - require manual review
  if (hasCriticalDamage(damageParts)) {
    return {
      decision: 'In Review',
      reason: `Critical damage parts detected: ${damageParts.join(', ')} - requires manual review`,
      confidence: confidence,
      requiresReview: true
    };
  }

  // Rule 6: Vehicle age consideration
  const vehicleAge = getVehicleAge(policy);
  let severityAdjustment = 0;
  let ageNote = '';
  
  if (vehicleAge !== null) {
    if (vehicleAge >= AUTOMATION_CONFIG.VERY_OLD_VEHICLE_THRESHOLD) {
      // Very old vehicles: be more lenient (lower threshold for approval)
      severityAdjustment = -5;
      ageNote = ` (Vehicle age: ${vehicleAge} years - lenient threshold applied)`;
    } else if (vehicleAge >= AUTOMATION_CONFIG.OLD_VEHICLE_THRESHOLD) {
      // Old vehicles: slightly more lenient
      severityAdjustment = -3;
      ageNote = ` (Vehicle age: ${vehicleAge} years)`;
    }
  }

  // Rule 7: Low severity - Auto Approve (with vehicle age adjustment)
  const adjustedApproveThreshold = AUTOMATION_CONFIG.AUTO_APPROVE_MAX_SEVERITY + severityAdjustment;
  if (severity <= adjustedApproveThreshold) {
    return {
      decision: 'Approved',
      reason: `Low severity damage (${severity}/100) with high confidence (${(confidence * 100).toFixed(1)}%)${ageNote}`,
      confidence: confidence,
      requiresReview: false
    };
  }

  // Rule 8: High severity - Auto Reject
  if (severity >= AUTOMATION_CONFIG.AUTO_REJECT_MIN_SEVERITY) {
    return {
      decision: 'Rejected',
      reason: `High severity damage (${severity}/100) exceeds threshold${ageNote}`,
      confidence: confidence,
      requiresReview: false
    };
  }

  // Rule 9: Medium severity (between thresholds) - Manual Review
  return {
    decision: 'In Review',
    reason: `Medium severity damage (${severity}/100) requires manual assessment${ageNote}`,
    confidence: confidence,
    requiresReview: true
  };
}

/**
 * Apply automated decision to a claim
 * @param {string} claimId - The claim ID
 * @returns {Object} Result object with success, decision, and details
 */
async function applyAutoDecision(claimId) {
  try {
    const claim = await Claim.findByPk(claimId, {
      include: [{
        model: Policy,
        as: 'policy',
        required: false
      }]
    });

    if (!claim) {
      throw new Error('Claim not found');
    }

    // Don't override if already decided (unless it's still "Submitted")
    if (claim.status !== 'Submitted') {
      return {
        success: false,
        reason: `Claim already has status: ${claim.status}`,
        decision: null
      };
    }

    // Get user for claim history check
    const user = await User.findByPk(claim.userId, {
      attributes: ['id', 'name', 'email']
    });

    // Get automated decision
    const decision = await autoDecideClaim(claim, claim.policy, user);

    if (!decision.decision) {
      return {
        success: false,
        reason: decision.reason || 'No decision made',
        decision: null
      };
    }

    // Prepare update data
    const updateData = {
      status: decision.decision,
      autoDecision: true,
      autoDecisionReason: decision.reason,
      autoDecisionAt: new Date(),
      autoDecisionConfidence: decision.confidence
    };

    // Calculate payout if approved
    if (decision.decision === 'Approved') {
      try {
        // Calculate payout based on severity and policy premium
        const policy = await Policy.findByPk(claim.policyId);
        if (policy) {
          const policyPremium = policy.premium || 0;
          const severity = claim.mlSeverity || 0;
          
          // Calculate payout: severity percentage of policy premium
          let payoutMultiplier = severity / 100;
          
          // Minimum payout: 10% of premium for any approved claim
          // Maximum payout: 90% of premium (to leave some buffer)
          if (severity >= 60) {
            payoutMultiplier = Math.min(0.9, payoutMultiplier); // Cap at 90%
          } else if (severity >= 40) {
            payoutMultiplier = Math.max(0.3, payoutMultiplier); // At least 30%
          } else {
            payoutMultiplier = Math.max(0.1, payoutMultiplier); // At least 10%
          }
          
          const payout = Math.round(policyPremium * payoutMultiplier);
          updateData.payoutAmount = payout;
          updateData.payoutStatus = payout > 0 ? 'Approved' : 'Pending';
          updateData.verified = true;
        } else {
          updateData.payoutAmount = 0;
          updateData.payoutStatus = 'Pending';
          updateData.verified = true;
        }
      } catch (payoutError) {
        console.error('Error calculating payout:', payoutError);
        // Continue with approval even if payout calculation fails
        updateData.payoutAmount = 0;
        updateData.payoutStatus = 'Pending';
        updateData.verified = true;
      }
    } else if (decision.decision === 'Rejected') {
      updateData.payoutAmount = 0;
      updateData.payoutStatus = 'Rejected';
      updateData.verified = false;
    }

    // Update claim
    await claim.update(updateData);

    // Write to blockchain
    let blockchainResult = null;
    if (blockchainService.isAvailable()) {
      try {
        blockchainResult = await blockchainService.updateClaimStatus(
          claim.id,
          decision.decision
        );

        await BlockchainRecord.create({
          entityType: 'Claim',
          entityId: claim.id,
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber,
          eventName: 'ClaimAutoDecided',
          timestamp: blockchainResult.timestamp
        });
      } catch (blockchainError) {
        console.error('Blockchain write error (non-fatal):', blockchainError);
      }
    }

    console.log(`\n🤖 Automated Decision Applied:`);
    console.log(`   Claim ID: ${claim.id}`);
    console.log(`   Decision: ${decision.decision}`);
    console.log(`   Reason: ${decision.reason}`);
    console.log(`   Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`   Requires Review: ${decision.requiresReview ? 'Yes' : 'No'}`);

    return {
      success: true,
      decision: decision.decision,
      reason: decision.reason,
      confidence: decision.confidence,
      requiresReview: decision.requiresReview,
      blockchain: blockchainResult
    };
  } catch (error) {
    console.error('Error applying auto decision:', error);
    return {
      success: false,
      reason: error.message,
      decision: null
    };
  }
}

/**
 * Get automation configuration (for admin settings)
 */
function getConfig() {
  return { ...AUTOMATION_CONFIG };
}

/**
 * Update automation configuration (for admin settings)
 */
function updateConfig(newConfig) {
  Object.assign(AUTOMATION_CONFIG, newConfig);
  return { ...AUTOMATION_CONFIG };
}

module.exports = {
  autoDecideClaim,
  applyAutoDecision,
  getConfig,
  updateConfig,
  isPolicyActive,
  hasCriticalDamage
};

