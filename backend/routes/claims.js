const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { Claim, ClaimPhoto, Policy, PolicyType, BlockchainRecord } = require('../models/sequelize');
const { auth } = require('../middleware/auth');
const blockchainService = require('../services/blockchain');
const ipfsService = require('../services/ipfs');

// Service URLs
const ML_ANALYZER_URL = process.env.ML_ANALYZER_URL || 'http://localhost:8000';

// Uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir, // Use absolute path
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG images are allowed'));
    }
  }
});

// Get all claims (user's own claims)
router.get('/', auth, async (req, res) => {
  try {
    const claims = await Claim.findAll({
      where: { userId: req.user.id },
      include: [
        { 
          model: Policy, 
          as: 'policy',
          attributes: ['id', 'policyTypeId', 'vehicleType', 'vehicleBrand', 'vehicleModel', 'registrationNumber'],
          required: false, // Left join - allow claims without policies
          include: [{ 
            model: PolicyType, 
            as: 'policyTypeRef', 
            attributes: ['id', 'name'],
            required: false // Left join - allow policies without policy types
          }]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    // Get photos for each claim
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
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single claim
router.get('/:id', auth, async (req, res) => {
  try {
    const { User } = require('../models/sequelize');
    const claim = await Claim.findByPk(req.params.id, {
      include: [
        { 
          model: Policy, 
          as: 'policy',
          attributes: ['id', 'policyTypeId', 'vehicleType', 'vehicleBrand', 'vehicleModel', 'registrationNumber'],
          include: [{
            model: PolicyType,
            as: 'policyTypeRef',
            attributes: ['id', 'name', 'description'],
            required: false
          }]
        },
        { model: User, as: 'user', attributes: ['name', 'email'] }
      ]
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    // Check if user owns this claim or is admin
    if (claim.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const photos = await ClaimPhoto.findAll({ where: { claimId: claim.id } });

    res.json({
      success: true,
      claim: {
        ...claim.toJSON(),
        photos
      }
    });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get ML report from Pinata using CID
router.get('/:id/ml-report', auth, async (req, res) => {
  try {
    const claim = await Claim.findByPk(req.params.id);

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    // Check if user owns this claim or is admin
    if (claim.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!claim.mlReportCID) {
      return res.status(404).json({ success: false, message: 'ML report CID not found' });
    }

    // Fetch ML report from Pinata gateway
    const pinataGateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
    const reportUrl = `${pinataGateway}/${claim.mlReportCID}`;
    
    console.log(`📥 Fetching ML report from Pinata: ${reportUrl}`);
    
    try {
      const response = await axios.get(reportUrl, { timeout: 10000 });
      const mlReport = response.data;
      
      console.log(`✅ ML report fetched successfully. Severity: ${mlReport.severity}`);
      
      res.json({
        success: true,
        mlReport: {
          severity: mlReport.severity,
          damage_parts: mlReport.damage_parts || [],
          confidence: mlReport.confidence,
          timestamp: mlReport.timestamp,
          is_vehicle: mlReport.is_vehicle,
          validation_error: mlReport.validation_error,
          fullReport: mlReport // Include full report for debugging
        }
      });
    } catch (fetchError) {
      console.error('Error fetching ML report from Pinata:', fetchError.message);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch ML report from Pinata',
        error: fetchError.message 
      });
    }
  } catch (error) {
    console.error('Get ML report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit claim with photos
router.post('/submit', auth, upload.array('photos', 5), [
  body('policyId').notEmpty().withMessage('Policy ID is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { policyId, description } = req.body;

    // Validate required fields
    if (!policyId) {
      return res.status(400).json({ success: false, message: 'Policy ID is required' });
    }
    if (!description || (typeof description === 'string' && description.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    console.log('📋 Claim submission request:', {
      policyId,
      descriptionLength: description ? description.length : 0,
      filesCount: req.files ? req.files.length : 0,
      userId: req.user.id
    });

    // Verify policy exists and belongs to user
    const policy = await Policy.findByPk(policyId);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    if (policy.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Policy does not belong to you' });
    }

    // Create claim
    console.log('📝 Creating claim with:', { 
      policyId,
      userId: req.user.id,
      description: description ? (description.length > 50 ? description.substring(0, 50) + '...' : description) : 'N/A',
      filesCount: req.files ? req.files.length : 0
    });
    let claim;
    try {
      claim = await Claim.create({
        policyId,
        userId: req.user.id,
        description: description || '',
        status: 'Submitted'
    });
      console.log('✅ Claim created successfully:', claim.id);
    } catch (createError) {
      console.error('❌ Failed to create claim:', createError);
      console.error('❌ Create error details:', {
        message: createError.message,
        name: createError.name,
        errors: createError.errors
      });
      throw createError;
    }

    // Step 1: Upload photos to IPFS AND keep local copy
    const photos = [];
    const evidenceCids = [];
    let firstPhotoCID = null;
    let firstPhotoPath = null; // Keep path for direct Gemini upload

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Step 1a: Upload to IPFS (if available)
          let ipfsCid = null;
          let ipfsUrl = null;
          
          if (ipfsService.isAvailable()) {
            try {
            const ipfsResult = await ipfsService.uploadFile(file.path, file.originalname);
            
            if (ipfsResult) {
                // Handle both object and string return types
                if (typeof ipfsResult === 'string') {
                  ipfsCid = ipfsResult;
                  ipfsUrl = ipfsService.getGatewayUrl ? ipfsService.getGatewayUrl(ipfsResult) : null;
                } else if (ipfsResult.cid) {
              ipfsCid = ipfsResult.cid;
                  ipfsUrl = ipfsResult.url || (ipfsService.getGatewayUrl ? ipfsService.getGatewayUrl(ipfsResult.cid) : null);
                } else {
                  ipfsCid = ipfsResult;
                  ipfsUrl = null;
                }
                
                if (ipfsCid) {
              evidenceCids.push(ipfsCid);
              console.log(`✅ Photo uploaded to IPFS: ${ipfsCid}`);
              
              // Store first photo CID for ML analysis
              if (!firstPhotoCID) {
                firstPhotoCID = ipfsCid;
              }
                }
            } else {
                console.warn('⚠️  IPFS upload returned null, continuing with local storage');
              }
            } catch (ipfsError) {
              console.warn('⚠️  IPFS upload error, continuing with local storage:', ipfsError.message);
            }
          } else {
            console.warn('⚠️  IPFS not available, using local storage only');
          }

          // Step 1b: Save local copy (move from temp to permanent location)
          const permanentPath = path.join(uploadsDir, `${claim.id}_${file.filename}`);
          
          // Ensure uploads directory exists
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Check if source file exists before copying
          if (!fs.existsSync(file.path)) {
            throw new Error(`Source file not found: ${file.path}`);
          }
          
          fs.copyFileSync(file.path, permanentPath);
          console.log(`💾 Saved photo to permanent location: ${permanentPath}`);
          
          // Store first photo path for Gemini analysis (always use permanent path)
          if (!firstPhotoPath) {
            firstPhotoPath = permanentPath;
            console.log(`📸 Set firstPhotoPath for ML analysis: ${firstPhotoPath}`);
          }

          // Step 1c: Save photo record in database
          const claimPhoto = await ClaimPhoto.create({
            claimId: claim.id,
            ipfsCid: ipfsCid || 'local-only',
            url: ipfsUrl || `/uploads/${claim.id}_${file.filename}`,
            blockchainIncluded: false
          });
          photos.push(claimPhoto);

          // Clean up temp file (we have permanent copy now)
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (error) {
          console.error('Photo processing error:', error);
          // Save photo record even if IPFS/local save failed
          try {
            const claimPhoto = await ClaimPhoto.create({
              claimId: claim.id,
              ipfsCid: 'upload-failed',
              url: `/uploads/${file.filename}`,
              blockchainIncluded: false
            });
            photos.push(claimPhoto);
          } catch (saveError) {
            console.error('Failed to save photo record:', saveError);
          }
        }
      }
    }

    // Step 2: ML Analysis - Send image directly to Gemini (bypass IPFS)
    // Wrap entire ML section in try-catch to prevent crashes
    let mlReport = null;
    try {
    console.log(`\n🔍 ML Analysis Check:`);
    console.log(`   firstPhotoPath: ${firstPhotoPath}`);
    console.log(`   firstPhotoPath exists: ${firstPhotoPath ? fs.existsSync(firstPhotoPath) : 'N/A'}`);
    console.log(`   ML_ANALYZER_URL: ${ML_ANALYZER_URL}`);
    
    if (firstPhotoPath && fs.existsSync(firstPhotoPath)) {
      try {
        console.log(`\n🔍 Sending image directly to Gemini for analysis:`);
        console.log(`   File path: ${firstPhotoPath}`);
        console.log(`   File size: ${fs.statSync(firstPhotoPath).size} bytes`);
        console.log(`   ML Analyzer URL: ${ML_ANALYZER_URL}/analyze/upload`);
        
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(firstPhotoPath), path.basename(firstPhotoPath));
        
        console.log(`📤 Making request to ML analyzer...`);
        const mlResponse = await axios.post(`${ML_ANALYZER_URL}/analyze/upload`, formData, {
          headers: formData.getHeaders(),
          timeout: 30000
        });
        console.log(`✅ ML analyzer responded with status: ${mlResponse.status}`);
        console.log(`📦 Response data:`, JSON.stringify(mlResponse.data, null, 2));
        
        if (mlResponse && mlResponse.data) {
          mlReport = mlResponse.data;
          
          // Check if ML validation failed (non-vehicle image)
          if (mlReport.is_vehicle === false || mlReport.validation_error) {
            console.warn(`⚠️  ML Validation failed: ${mlReport.validation_error || 'Not a vehicle'}`);
            // Mark claim with validation error but don't fail the submission
            claim.mlValidationError = mlReport.validation_error || 'Image does not appear to be a vehicle';
            claim.mlSeverity = 0;
            claim.mlConfidence = 0;
          } else {
            claim.mlSeverity = mlReport.severity;
            claim.mlReportCID = mlReport.mlReportCID || null;
            claim.damageParts = mlReport.damage_parts || [];
            claim.mlConfidence = mlReport.confidence || null;
            console.log(`\n✅ ML Analysis complete:`);
            console.log(`   Severity: ${mlReport.severity}`);
            console.log(`   Confidence: ${mlReport.confidence}`);
            console.log(`   Damage Parts: ${mlReport.damage_parts?.join(', ') || 'None'}`);
            console.log(`   ML Report CID: ${mlReport.mlReportCID || 'Not uploaded to IPFS'}`);
          }
        } else {
          console.warn(`⚠️  ML analyzer returned empty response`);
        }
      } catch (mlError) {
        console.error(`\n❌ ML Analysis Error:`);
        console.error(`   Error message: ${mlError.message}`);
        if (mlError.response) {
          console.error(`   Status: ${mlError.response.status}`);
          console.error(`   Response data:`, JSON.stringify(mlError.response.data, null, 2));
        }
        if (mlError.code) {
          console.error(`   Error code: ${mlError.code}`);
        }
        console.error(`   Full error:`, mlError);
        
        // Handle specific validation errors (400 status)
        if (mlError.response && mlError.response.status === 400) {
          const errorDetail = mlError.response.data?.detail || {};
          console.warn(`⚠️  ML Validation failed: ${errorDetail.message || errorDetail.error || 'Invalid image'}`);
          claim.mlValidationError = errorDetail.message || errorDetail.error || 'Image validation failed';
          claim.mlSeverity = 0;
          claim.mlConfidence = 0;
        } else {
          console.error('⚠️  ML Analysis error (non-fatal):', mlError.message);
          // Continue without ML analysis for other errors
        }
      }
    } else {
      console.warn(`\n⚠️  ML Analysis skipped:`);
      console.warn(`   Reason: ${!firstPhotoPath ? 'No photo path set' : 'Photo file does not exist'}`);
      if (firstPhotoPath) {
        console.warn(`   Expected path: ${firstPhotoPath}`);
      }
    }

      // Save claim with any ML updates (wrap in try-catch to prevent crashes)
      try {
    await claim.save();
      } catch (saveError) {
        console.error('❌ Error saving claim after ML analysis:', saveError.message);
        console.error('   Save error details:', saveError);
        // Continue - claim was already created, this is just updating ML fields
      }
    } catch (mlSectionError) {
      console.error('❌ ML Analysis section error (non-fatal):', mlSectionError.message);
      console.error('   Full error:', mlSectionError);
      // Continue with claim submission even if ML analysis fails completely
    }

    // Step 2.5: Apply Automated Decision (after ML analysis)
    let autoDecisionResult = null;
    try {
      const claimAutomation = require('../services/claimAutomation');
      console.log('\n🤖 Applying automated decision...');
      
      // Reload claim to get latest ML data with policy and user
      await claim.reload({
        include: [
          {
            model: Policy,
            as: 'policy',
            required: false
          },
          {
            model: require('../models/sequelize').User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });
      
      autoDecisionResult = await claimAutomation.applyAutoDecision(claim.id);
      
      if (autoDecisionResult.success) {
        console.log(`✅ Automated decision applied: ${autoDecisionResult.decision}`);
        if (autoDecisionResult.requiresReview) {
          console.log(`   ⚠️  This claim requires manual review`);
        }
      } else {
        console.log(`⚠️  Automated decision not applied: ${autoDecisionResult.reason}`);
      }
    } catch (autoError) {
      console.error('❌ Error applying automated decision (non-fatal):', autoError.message);
      // Continue - automation failure should not block claim submission
    }

    // Step 3: Write to blockchain (enhanced contract with ML data)
    let blockchainResult = null;
    if (blockchainService.isAvailable() && evidenceCids.length > 0) {
      try {
        blockchainResult = await blockchainService.submitClaimWithML(
          claim.id,
          policyId,
          req.user.id,
          description,
          evidenceCids,
          claim.mlReportCID || '',
          Math.floor(claim.mlSeverity || 0)
        );

        await claim.update({
          claimIdOnChain: claim.id,
          blockchainTxHash: blockchainResult.txHash
        });

        // Update photos to mark as blockchain included
        await ClaimPhoto.update(
          { blockchainIncluded: true },
          { where: { claimId: claim.id } }
        );

        // Create blockchain record
        await BlockchainRecord.create({
          entityType: 'Claim',
          entityId: claim.id,
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber,
          eventName: 'ClaimSubmitted',
          timestamp: blockchainResult.timestamp
        });
      } catch (blockchainError) {
        console.error('Blockchain write error (non-fatal):', blockchainError);
        // Continue even if blockchain fails
      }
    }

    // Refresh claim to get latest data (wrap in try-catch)
    try {
      await claim.reload();
    } catch (reloadError) {
      console.warn('⚠️  Could not reload claim, using current data:', reloadError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully',
      claim: {
        ...claim.toJSON(),
        photos
      },
      mlAnalysis: mlReport ? {
        severity: mlReport.severity || 0,
        damageParts: mlReport.damage_parts || [],
        confidence: mlReport.confidence || 0,
        mlReportCID: mlReport.mlReportCID || null
      } : null,
      automation: autoDecisionResult ? {
        decision: autoDecisionResult.decision,
        reason: autoDecisionResult.reason,
        requiresReview: autoDecisionResult.requiresReview
      } : null,
      blockchain: blockchainResult
    });
  } catch (error) {
    console.error('Submit claim error:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
          fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('Error cleaning up file:', unlinkError);
          }
        }
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get claim for Oracle (no auth required, internal service call)
router.get('/:id/oracle', async (req, res) => {
  try {
    const { User } = require('../models/sequelize');
    const claim = await Claim.findByPk(req.params.id, {
      include: [
        { model: Policy, as: 'policy' },
        { model: User, as: 'user', attributes: ['name', 'email'] }
      ]
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    res.json({
      success: true,
      claim: {
        ...claim.toJSON(),
        severity: claim.mlSeverity || 0
      }
    });
  } catch (error) {
    console.error('Get claim for Oracle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update claim from Oracle (called by Oracle service)
router.patch('/:id/updateFromOracle', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verified, payoutAmount, blockchainEvaluated } = req.body;

    const claim = await Claim.findByPk(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    // Update claim fields
    const updateData = {};
    if (status) updateData.status = status;
    if (verified !== undefined) updateData.verified = verified;
    if (payoutAmount !== undefined) {
      updateData.payoutAmount = payoutAmount;
      updateData.payoutStatus = payoutAmount > 0 ? 'Approved' : 'Rejected';
    }
    if (blockchainEvaluated !== undefined) updateData.blockchainEvaluated = blockchainEvaluated;

    await claim.update(updateData);

    res.json({
      success: true,
      message: 'Claim updated from Oracle',
      claim
    });
  } catch (error) {
    console.error('Update from Oracle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete claim (user can delete their own claim, admin can delete any)
router.delete('/:id', auth, async (req, res) => {
  try {
    const claim = await Claim.findByPk(req.params.id);
    
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    // Check if user owns this claim or is admin
    if (claim.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Prevent deletion of approved claims (optional safety check)
    if (claim.status === 'Approved' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an approved claim. Please contact admin if you need to remove it.'
      });
    }

    // Get IPFS CIDs before deleting photos
    const claimPhotos = await ClaimPhoto.findAll({ where: { claimId: claim.id } });
    const ipfsCids = claimPhotos.map(photo => photo.ipfsCid).filter(cid => cid && cid !== 'local-only' && cid !== 'upload-failed');
    
    // Delete related photos
    await ClaimPhoto.destroy({ where: { claimId: claim.id } });

    // Delete blockchain records if exists
    if (claim.blockchainTxHash) {
      try {
        await BlockchainRecord.destroy({ 
          where: { 
            entityType: 'Claim', 
            entityId: claim.id 
          }
        });
      } catch (blockchainError) {
        console.error('Error deleting blockchain records:', blockchainError);
        // Continue with claim deletion even if blockchain record deletion fails
      }
    }

    // Note: IPFSFile model not yet migrated to Sequelize, skipping IPFS record deletion for now

    await claim.destroy();

    res.json({
      success: true,
      message: 'Claim deleted successfully'
    });
  } catch (error) {
    console.error('Delete claim error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;