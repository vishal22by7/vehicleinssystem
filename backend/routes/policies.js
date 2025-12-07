const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { Policy, PolicyType, BlockchainRecord } = require('../models/sequelize');
const { auth } = require('../middleware/auth');
const blockchainService = require('../services/blockchain');
const ipfsService = require('../services/ipfs');

// Configure multer for document uploads
const uploadsDir = path.join(__dirname, '../uploads/policies');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'));
    }
  }
});

const router = express.Router();

// Get all policies (user's own policies)
router.get('/', auth, async (req, res) => {
  try {
    const policies = await Policy.findAll({
      where: { userId: req.user.id },
      include: [{ model: PolicyType, as: 'policyTypeRef', attributes: ['name', 'description'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      policies
    });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch policies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single policy
router.get('/:id', auth, async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id, {
      include: [
        { model: PolicyType, as: 'policyTypeRef' },
        { model: require('../models/sequelize').User, as: 'user', attributes: ['name', 'email'] }
      ]
    });

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    // Check if user owns this policy or is admin
    if (policy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch policy',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to validate chassis number (17 chars, no I, O, Q)
function validateChassisNumber(chassisNumber) {
  if (!chassisNumber || typeof chassisNumber !== 'string') {
    return false;
  }
  const cleaned = chassisNumber.toUpperCase().trim();
  if (cleaned.length !== 17) {
    return false;
  }
  // VIN pattern: 17 alphanumeric characters, excluding I, O, Q
  const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinPattern.test(cleaned);
}

/**
 * Map policy type name to database enum value
 * Database enum only accepts: 'TP', 'OD', 'Comprehensive', 'StandaloneOD'
 */
function mapPolicyTypeToEnum(policyTypeName) {
  if (!policyTypeName) {
    return 'Comprehensive'; // Default
  }
  
  const normalized = policyTypeName.toLowerCase().trim();
  
  // Check for TP/Third-Party
  if (normalized.includes('tp') || 
      normalized.includes('third-party') || 
      normalized.includes('third party')) {
    return 'TP';
  }
  
  // Check for OD/Own Damage (but not StandaloneOD)
  if ((normalized.includes('od') || normalized.includes('own damage')) &&
      !normalized.includes('standalone') && !normalized.includes('stand-alone')) {
    return 'OD';
  }
  
  // Check for StandaloneOD
  if (normalized.includes('standalone') || normalized.includes('stand-alone')) {
    return 'StandaloneOD';
  }
  
  // Default to Comprehensive (covers "Comprehensive", "Two-Wheeler Comprehensive", etc.)
  return 'Comprehensive';
}

// Buy policy
router.post('/buy', auth, upload.fields([
  { name: 'rcDocument', maxCount: 1 },
  { name: 'salesInvoice', maxCount: 1 },
  { name: 'previousPolicyCopy', maxCount: 1 },
  { name: 'puc', maxCount: 1 },
  { name: 'dl', maxCount: 1 },
  { name: 'vehiclePhoto_0', maxCount: 1 },
  { name: 'vehiclePhoto_1', maxCount: 1 },
  { name: 'vehiclePhoto_2', maxCount: 1 },
  { name: 'vehiclePhoto_3', maxCount: 1 },
  { name: 'vehiclePhoto_4', maxCount: 1 },
  { name: 'vehiclePhoto_5', maxCount: 1 }
]), [
  body('policyTypeId').notEmpty().withMessage('Policy type is required'),
  body('premium').isFloat({ min: 0 }).withMessage('Premium is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
  body('vehicleBrand').notEmpty().withMessage('Vehicle brand is required'),
  body('vehicleModel').notEmpty().withMessage('Vehicle model is required'),
  body('modelYear').isInt().withMessage('Model year is required'),
  body('engineCapacity').isFloat({ min: 0 }).withMessage('Engine capacity is required'),
  body('registrationNumber').notEmpty().trim().withMessage('Vehicle registration number is required'),
  body('chassisNumber').notEmpty().trim().withMessage('Chassis number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Parse form data (can be JSON strings from FormData)
    const parseField = (field) => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    const {
      policyTypeId,
      premium,
      startDate,
      endDate,
      vehicleCategory,
      policyType: policyTypeValue,
      usageType,
      coverType,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      variant,
      fuelType,
      modelYear,
      yearOfManufacture,
      engineCapacity,
      seatingCapacity,
      registrationNumber,
      registrationDate,
      rtoState,
      rtoCity,
      chassisNumber,
      engineNumber,
      isFinanced,
      financierName,
      previousPolicy,
      ownerDetails,
      nominee,
      addOns,
      declarations,
      exShowroomPrice
    } = req.body;

    // Parse complex fields
    const parsedPreviousPolicy = parseField(previousPolicy);
    const parsedOwnerDetails = parseField(ownerDetails);
    const parsedNominee = parseField(nominee);
    const parsedDeclarations = parseField(declarations);
    let parsedAddOns = [];
    if (addOns) {
      try {
        parsedAddOns = typeof addOns === 'string' ? JSON.parse(addOns) : addOns;
      } catch (e) {
        parsedAddOns = [];
      }
    }

    // Verify policy type exists
    const policyTypeDoc = await PolicyType.findByPk(policyTypeId);
    if (!policyTypeDoc) {
      return res.status(404).json({ success: false, message: 'Policy type not found' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // Allow start date to be today (compare dates only, not time)
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (startDateOnly < nowDateOnly) {
      return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
    }
    
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    // Validate model year
    const currentYear = new Date().getFullYear();
    if (modelYear < 1900 || modelYear > currentYear + 1) {
      return res.status(400).json({ success: false, message: 'Invalid model year' });
    }

    // Validate chassis number
    const cleanedChassis = chassisNumber.toUpperCase().trim();
    if (!validateChassisNumber(cleanedChassis)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid chassis number. Must be exactly 17 alphanumeric characters (no I, O, or Q)' 
      });
    }

    // Check for duplicate registration number
    const existingPolicy = await Policy.findOne({ 
      where: { registrationNumber: registrationNumber.toUpperCase().trim() }
    });
    if (existingPolicy) {
      return res.status(400).json({ 
        success: false, 
        message: 'A policy already exists for this vehicle registration number' 
      });
    }

    // Calculate premium breakdown if not provided
    let premiumBreakdown = null;
    let calculatedIdv = null;
    if (exShowroomPrice && yearOfManufacture && registrationDate) {
      const premiumCalculator = require('../services/premiumCalculator');
      calculatedIdv = premiumCalculator.calculateIDV(
        parseFloat(exShowroomPrice),
        parseInt(yearOfManufacture),
        registrationDate
      );
      
      const calcResult = premiumCalculator.calculatePremium({
        vehicleCategory: vehicleCategory || '4W',
        policyType: policyType || 'Comprehensive',
        engineCapacity: parseFloat(engineCapacity),
        yearOfManufacture: parseInt(yearOfManufacture),
        registrationDate: registrationDate,
        exShowroomPrice: parseFloat(exShowroomPrice),
        previousNCB: parsedPreviousPolicy?.ncbPercentage || 0,
        addOns: parsedAddOns,
        vehicleType: vehicleType || 'Car'
      });
      premiumBreakdown = calcResult.breakdown;
    }

    // Handle document uploads
    const documents = {
      rcDocument: { path: null, ipfsCid: null },
      salesInvoice: { path: null, ipfsCid: null },
      previousPolicyCopy: { path: null, ipfsCid: null },
      puc: { path: null, ipfsCid: null },
      drivingLicense: { path: null, ipfsCid: null },
      vehiclePhotos: []
    };

    if (req.files) {
      // RC Document is required
      if (!req.files.rcDocument || req.files.rcDocument.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'RC Document is required' 
        });
      }

      // Process RC Document
      const rcFile = req.files.rcDocument[0];
      documents.rcDocument.path = rcFile.path;
      
      // Upload to IPFS if available
      if (ipfsService.isAvailable()) {
        try {
          const rcCid = await ipfsService.uploadFile(rcFile.path, rcFile.originalname);
          if (rcCid) {
            documents.rcDocument.ipfsCid = rcCid;
          }
        } catch (ipfsError) {
          console.error('IPFS upload error for RC:', ipfsError);
        }
      }

      // Process Sales Invoice
      if (req.files.salesInvoice && req.files.salesInvoice.length > 0) {
        const invoiceFile = req.files.salesInvoice[0];
        documents.salesInvoice.path = invoiceFile.path;
        if (ipfsService.isAvailable()) {
          try {
            const cid = await ipfsService.uploadFile(invoiceFile.path, invoiceFile.originalname);
            if (cid) documents.salesInvoice.ipfsCid = cid;
          } catch (e) { console.error('IPFS error for invoice:', e); }
        }
      }

      // Process Previous Policy Copy
      if (req.files.previousPolicyCopy && req.files.previousPolicyCopy.length > 0) {
        const prevFile = req.files.previousPolicyCopy[0];
        documents.previousPolicyCopy.path = prevFile.path;
        if (ipfsService.isAvailable()) {
          try {
            const cid = await ipfsService.uploadFile(prevFile.path, prevFile.originalname);
            if (cid) documents.previousPolicyCopy.ipfsCid = cid;
          } catch (e) { console.error('IPFS error for prev policy:', e); }
        }
      }

      // Process PUC
      if (req.files.puc && req.files.puc.length > 0) {
        const pucFile = req.files.puc[0];
        documents.puc.path = pucFile.path;
        if (ipfsService.isAvailable()) {
          try {
            const cid = await ipfsService.uploadFile(pucFile.path, pucFile.originalname);
            if (cid) documents.puc.ipfsCid = cid;
          } catch (e) { console.error('IPFS error for PUC:', e); }
        }
      }

      // Process Driving License
      if (req.files.dl && req.files.dl.length > 0) {
        const dlFile = req.files.dl[0];
        documents.drivingLicense.path = dlFile.path;
        if (ipfsService.isAvailable()) {
          try {
            const cid = await ipfsService.uploadFile(dlFile.path, dlFile.originalname);
            if (cid) documents.drivingLicense.ipfsCid = cid;
          } catch (e) { console.error('IPFS error for DL:', e); }
        }
      }

      // Process Vehicle Photos
      const photoKeys = Object.keys(req.files).filter(key => key.startsWith('vehiclePhoto_'));
      for (const key of photoKeys) {
        const photoFile = req.files[key][0];
        const photoDoc = { path: photoFile.path, ipfsCid: null };
        if (ipfsService.isAvailable()) {
          try {
            const cid = await ipfsService.uploadFile(photoFile.path, photoFile.originalname);
            if (cid) photoDoc.ipfsCid = cid;
          } catch (e) { console.error('IPFS error for photo:', e); }
        }
        documents.vehiclePhotos.push(photoDoc);
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'RC Document is required' 
      });
    }

    // Generate proposal number
    const proposalNumber = `VIMS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Map policy type name to database enum value
    const mappedPolicyType = mapPolicyTypeToEnum(policyTypeValue);

    // Create policy with all Indian insurance fields
    const policy = await Policy.create({
      userId: req.user.id,
      policyTypeId,
      vehicleCategory: vehicleCategory || '4W',
      policyType: mappedPolicyType, // Use mapped enum value
      usageType: usageType || 'Private',
      coverType: coverType || 'New',
      premium: parseFloat(premium),
      premiumBreakdown: premiumBreakdown || {},
      idv: calculatedIdv,
      ncbPercentage: parsedPreviousPolicy?.ncbPercentage || 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      vehicleType,
      vehicleBrand,
      vehicleModel,
      variant: variant || '',
      fuelType: fuelType || 'Petrol',
      modelYear: parseInt(modelYear),
      yearOfManufacture: parseInt(yearOfManufacture || modelYear),
      engineCapacity: parseFloat(engineCapacity),
      seatingCapacity: parseInt(seatingCapacity || 5),
      registrationNumber: registrationNumber.toUpperCase().trim(),
      registrationDate: new Date(registrationDate),
      rtoState: rtoState || '',
      rtoCity: rtoCity || '',
      chassisNumber: cleanedChassis,
      engineNumber: engineNumber || '',
      isFinanced: isFinanced === 'true' || isFinanced === true,
      financierName: financierName || '',
      previousPolicy: parsedPreviousPolicy || {},
      ownerDetails: parsedOwnerDetails || {},
      nominee: parsedNominee || {},
      addOns: parsedAddOns,
      documents: documents,
      declarations: parsedDeclarations || {},
      status: 'Proposal',
      proposalNumber
    });

    // Write to blockchain
    let blockchainResult = null;
    if (blockchainService.isAvailable()) {
      try {
        blockchainResult = await blockchainService.issuePolicy(
          policy.id,
          req.user.id,
          premium,
          startDate,
          endDate
        );

        await policy.update({
          policyIdOnChain: policy.id,
          blockchainTxHash: blockchainResult.txHash
        });

        // Create blockchain record
        await BlockchainRecord.create({
          entityType: 'Policy',
          entityId: policy.id,
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber,
          eventName: 'PolicyIssued',
          timestamp: blockchainResult.timestamp
        });
      } catch (blockchainError) {
        console.error('Blockchain write error (non-fatal):', blockchainError);
        // Continue even if blockchain fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Policy purchased successfully',
      policy,
      blockchain: blockchainResult
    });
  } catch (error) {
    console.error('Buy policy error:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.errors.map(e => e.message)
      });
    }
    
    // Handle duplicate key errors (Sequelize)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Policy already exists' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete policy (user can delete their own policy, admin can delete any)
router.delete('/:id', auth, async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id);
    
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    // Check if user owns this policy or is admin
    if (policy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if policy has any claims
    const { Claim } = require('../models/sequelize');
    const claimsCount = await Claim.count({ where: { policyId: req.params.id } });
    
    if (claimsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete policy. ${claimsCount} claim(s) are associated with this policy. Please delete the claims first.`
      });
    }

    // Delete blockchain record if exists
    if (policy.blockchainTxHash) {
      try {
        await BlockchainRecord.destroy({ 
          where: { 
            entityType: 'Policy', 
            entityId: policy.id 
          }
        });
      } catch (blockchainError) {
        console.error('Error deleting blockchain records:', blockchainError);
        // Continue with policy deletion even if blockchain record deletion fails
      }
    }

    await policy.destroy();

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

