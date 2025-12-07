const express = require('express');
const { body, validationResult } = require('express-validator');
const { PolicyType } = require('../models/sequelize');
const premiumCalculator = require('../services/premiumCalculator');

const router = express.Router();

// Get all policy types (public endpoint for calculator and buy policy)
router.get('/policy-types', async (req, res) => {
  console.log('📋 Policy types request received');
  try {
    const policyTypes = await PolicyType.findAll({
      attributes: ['id', 'name', 'description', 'baseRate', 'ageFactor', 'engineFactor', 'addOns'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${policyTypes.length} policy types`);
    res.json({
      success: true,
      policyTypes
    });
  } catch (error) {
    console.error('❌ Get policy types error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Calculate premium (Indian Insurance with IRDAI rates)
router.post('/premium', [
  body('vehicleCategory').notEmpty().withMessage('Vehicle category is required'),
  body('policyType').notEmpty().withMessage('Policy type is required'),
  body('yearOfManufacture').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  body('engineCapacity').isFloat({ min: 0 }).withMessage('Engine capacity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

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
    } = req.body;

    // Use premium calculator service
    const calculationData = {
      vehicleCategory,
      policyType,
      engineCapacity: parseFloat(engineCapacity),
      yearOfManufacture: parseInt(yearOfManufacture),
      registrationDate: registrationDate || new Date().toISOString(),
      exShowroomPrice: exShowroomPrice || 500000, // Default if not provided
      previousNCB: parseFloat(previousNCB) || 0,
      addOns: Array.isArray(addOns) ? addOns : [],
      vehicleType
    };

    const result = premiumCalculator.calculatePremium(calculationData);

    const response = {
      success: true,
      calculation: {
        idv: result.idv,
        ...result.breakdown,
        ncbPercentage: result.ncbPercentage
      }
    };

    console.log('📤 Sending response');
    res.json(response);
  } catch (error) {
    console.error('❌ Premium calculation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Calculate IDV
router.post('/idv', [
  body('exShowroomPrice').isFloat({ min: 0 }).withMessage('Ex-showroom price is required'),
  body('yearOfManufacture').isInt({ min: 1900 }).withMessage('Valid year is required'),
  body('registrationDate').isISO8601().withMessage('Valid registration date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { exShowroomPrice, yearOfManufacture, registrationDate } = req.body;
    const idv = premiumCalculator.calculateIDV(
      parseFloat(exShowroomPrice),
      parseInt(yearOfManufacture),
      registrationDate
    );

    res.json({
      success: true,
      idv,
      depreciation: ((exShowroomPrice - idv) / exShowroomPrice * 100).toFixed(2) + '%'
    });
  } catch (error) {
    console.error('IDV calculation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Calculate NCB
router.post('/ncb', [
  body('claimFreeYears').isInt({ min: 0, max: 10 }).withMessage('Valid claim-free years is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { claimFreeYears } = req.body;
    const ncbPercentage = premiumCalculator.NCB_SLABS[Math.min(claimFreeYears, 5)] || 0;

    res.json({
      success: true,
      ncbPercentage,
      claimFreeYears: parseInt(claimFreeYears)
    });
  } catch (error) {
    console.error('NCB calculation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

