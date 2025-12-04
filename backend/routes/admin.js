const express = require('express');
const { body, validationResult } = require('express-validator');
const { PolicyType, Policy, Claim, User, ClaimPhoto, BlockchainRecord } = require('../models/sequelize');
const { adminAuth } = require('../middleware/auth');
const blockchainService = require('../services/blockchain');

const router = express.Router();

// Helper function to calculate payout based on severity and policy premium
async function calculatePayoutAmount(claim) {
  try {
    // Get policy premium
    const policy = await Policy.findByPk(claim.policyId);
    if (!policy) {
      console.warn('Policy not found for payout calculation, using default');
      return 0;
    }

    const policyPremium = policy.premium || 0;
    const severity = claim.mlSeverity || 0;
    
    // Calculate payout: severity percentage of policy premium
    // For high severity (>=60), use full percentage
    // For lower severity, use reduced percentage
    let payoutMultiplier = severity / 100;
    
    // Minimum payout: 10% of premium for any approved claim
    // Maximum payout: 90% of premium (to leave some buffer)
    if (severity >= 60) {
      payoutMultiplier = Math.min(0.9, payoutMultiplier); // Cap at 90%
    } else if (severity > 0) {
      payoutMultiplier = Math.max(0.1, payoutMultiplier * 0.8); // Reduced for lower severity
    } else {
      payoutMultiplier = 0.1; // Minimum 10% for approved claims
    }
    
    const payoutAmount = Math.floor(policyPremium * payoutMultiplier);
    console.log(`💰 Calculated payout: ₹${payoutAmount} (Premium: ₹${policyPremium}, Severity: ${severity}%, Multiplier: ${(payoutMultiplier * 100).toFixed(1)}%)`);
    
    return payoutAmount;
  } catch (error) {
    console.error('Error calculating payout:', error);
    return 0;
  }
}

// All routes require admin authentication
router.use(adminAuth);

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { role: 'user' } });
    const totalPolicies = await Policy.count();
    const totalClaims = await Claim.count();
    const pendingClaims = await Claim.count({ where: { status: 'Submitted' } });
    const inReviewClaims = await Claim.count({ where: { status: 'In Review' } });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPolicies,
        totalClaims,
        pendingClaims,
        inReviewClaims
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Policy Type Management
router.get('/policy-types', async (req, res) => {
  try {
    const policyTypes = await PolicyType.findAll({
      include: [{ model: User, as: 'createdByUser', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      policyTypes
    });
  } catch (error) {
    console.error('Get policy types error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/policy-types', [
  body('name').notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('baseRate').isFloat({ min: 0 }).withMessage('Base rate is required'),
  body('ageFactor').isFloat({ min: 0 }).withMessage('Age factor is required'),
  body('engineFactor').isFloat({ min: 0 }).withMessage('Engine factor is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, baseRate, ageFactor, engineFactor, addOns } = req.body;

    const policyType = await PolicyType.create({
      name,
      description,
      baseRate,
      ageFactor,
      engineFactor,
      addOns: addOns || {},
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Policy type created successfully',
      policyType
    });
  } catch (error) {
    console.error('Create policy type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/policy-types/:id', [
  body('name').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('baseRate').optional().isFloat({ min: 0 }),
  body('ageFactor').optional().isFloat({ min: 0 }),
  body('engineFactor').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const policyType = await PolicyType.findByPk(req.params.id);

    if (!policyType) {
      return res.status(404).json({ success: false, message: 'Policy type not found' });
    }

    await policyType.update(req.body);

    res.json({
      success: true,
      message: 'Policy type updated successfully',
      policyType
    });
  } catch (error) {
    console.error('Update policy type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/policy-types/:id', async (req, res) => {
  try {
    const policyType = await PolicyType.findByPk(req.params.id);
    
    if (!policyType) {
      return res.status(404).json({ success: false, message: 'Policy type not found' });
    }

    // Check if any policies use this type
    const policiesCount = await Policy.count({ where: { policyTypeId: req.params.id } });
    if (policiesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete policy type. ${policiesCount} policies are using it.`
      });
    }

    await policyType.destroy();

    res.json({
      success: true,
      message: 'Policy type deleted successfully'
    });
  } catch (error) {
    console.error('Delete policy type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: 'user' },
      attributes: { exclude: ['passwordHash'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all policies
router.get('/policies', async (req, res) => {
  try {
    const policies = await Policy.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: PolicyType, as: 'policyTypeRef', attributes: ['name', 'description'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      policies
    });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all claims
router.get('/claims', async (req, res) => {
  try {
    const claims = await Claim.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { 
          model: Policy, 
          as: 'policy',
          attributes: ['policyTypeId', 'vehicleType', 'vehicleBrand', 'vehicleModel'],
          include: [{ model: PolicyType, as: 'policyTypeRef', attributes: ['name'] }]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    const claimsWithPhotos = await Promise.all(
      claims.map(async (claim) => {
        const photos = await ClaimPhoto.findAll({ where: { claimId: claim.id } });
        return {
          ...claim.toJSON(),
          photos
        };
      })
    );

    res.json({
      success: true,
      claims: claimsWithPhotos
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update claim status
router.put('/claims/:id/status', [
  body('status').isIn(['Submitted', 'In Review', 'Approved', 'Rejected']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { status } = req.body;
    const claim = await Claim.findByPk(req.params.id, {
      include: [{ model: Policy, as: 'policy' }]
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    const oldStatus = claim.status;
    const updateData = { status };
    
    // Calculate payout if claim is being approved
    if (status === 'Approved' && claim.payoutAmount === 0) {
      const calculatedPayout = await calculatePayoutAmount(claim);
      updateData.payoutAmount = calculatedPayout;
      updateData.payoutStatus = calculatedPayout > 0 ? 'Approved' : 'Pending';
      updateData.verified = true;
      console.log(`✅ Auto-calculated payout for approved claim ${claim.id}: ₹${calculatedPayout}`);
    } else if (status === 'Rejected') {
      updateData.payoutAmount = 0;
      updateData.payoutStatus = 'Rejected';
      updateData.verified = false;
    }
    
    await claim.update(updateData);

    // Write to blockchain
    let blockchainResult = null;
    if (blockchainService.isAvailable()) {
      try {
        blockchainResult = await blockchainService.updateClaimStatus(
          claim.id,
          status
        );

        // Create blockchain record
        await BlockchainRecord.create({
          entityType: 'Claim',
          entityId: claim.id,
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber,
          eventName: 'ClaimStatusUpdated',
          timestamp: blockchainResult.timestamp
        });
      } catch (blockchainError) {
        console.error('Blockchain write error (non-fatal):', blockchainError);
        // Continue even if blockchain fails
      }
    }

    res.json({
      success: true,
      message: `Claim status updated from ${oldStatus} to ${status}`,
      claim,
      blockchain: blockchainResult
    });
  } catch (error) {
    console.error('Update claim status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Recalculate payout for approved claims
router.post('/claims/:id/recalculate-payout', async (req, res) => {
  try {
    const claim = await Claim.findByPk(req.params.id, {
      include: [{ model: Policy, as: 'policy' }]
    });
    
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    if (claim.status !== 'Approved') {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only calculate payout for approved claims' 
      });
    }

    const calculatedPayout = await calculatePayoutAmount(claim);
    await claim.update({
      payoutAmount: calculatedPayout,
      payoutStatus: calculatedPayout > 0 ? 'Approved' : 'Pending'
    });

    res.json({
      success: true,
      message: `Payout recalculated: ₹${calculatedPayout}`,
      claim
    });
  } catch (error) {
    console.error('Recalculate payout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

