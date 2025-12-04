/**
 * Hyperledger Fabric Simulation Service
 * Simulates private blockchain for internal verification
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Level } = require('level');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize LevelDB for private ledger simulation
const dbPath = path.join(__dirname, 'private-ledger');
let db = null;

try {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  db = new Level(dbPath, { valueEncoding: 'json' });
  console.log('✅ Private ledger (LevelDB) initialized');
} catch (error) {
  console.error('❌ Failed to initialize LevelDB:', error);
  // Fallback to in-memory storage
  db = new Map();
  console.warn('⚠️  Using in-memory storage (data will be lost on restart)');
}

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for fraud records (simulated)
const fraudRecords = new Map();

// Simulated internal validation rules
const validationRules = {
  checkPolicyValidity: async (policyId) => {
    // Simulate policy check
    return { valid: true, reason: 'Policy is active' };
  },
  
  checkFraudHistory: async (userId) => {
    // Check fraud records
    const records = fraudRecords.get(userId) || [];
    return {
      hasFraud: records.length > 0,
      count: records.length,
      records: records.slice(-5) // Last 5 records
    };
  },
  
  checkPoliceStatus: async (claimId) => {
    // Simulate police verification
    // In production, this would call actual police API
    return {
      verified: Math.random() > 0.2, // 80% verified
      reportNumber: `POL-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  },
  
  checkAgentReview: async (claimId, severity) => {
    // Simulate agent review
    // Low severity claims may need agent review
    if (severity < 40) {
      return {
        requiresReview: true,
        agentAssigned: `AGENT-${Math.floor(Math.random() * 100)}`,
        reviewStatus: 'pending'
      };
    }
    return {
      requiresReview: false,
      autoApproved: true
    };
  }
};

// Store verification record in private ledger
async function storeVerification(claimId, verificationData) {
  try {
    const key = `claim:${claimId}`;
    const data = {
      claimId,
      ...verificationData,
      timestamp: new Date().toISOString(),
      blockNumber: Date.now() // Simulated block number
    };
    
    if (db instanceof Map) {
      db.set(key, data);
    } else {
      await db.put(key, data);
    }
    
    return data;
  } catch (error) {
    console.error('Error storing verification:', error);
    throw error;
  }
}

// Get verification record
async function getVerification(claimId) {
  try {
    const key = `claim:${claimId}`;
    
    if (db instanceof Map) {
      return db.get(key) || null;
    } else {
      return await db.get(key).catch(() => null);
    }
  } catch (error) {
    return null;
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Fabric Simulator',
    status: 'running',
    description: 'Private blockchain verification service'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Ledger API endpoints for hybrid blockchain
app.post('/api/ledger/record', async (req, res) => {
  try {
    const { entityType, entityId, hash, timestamp, metadata } = req.body;
    
    if (!entityType || !entityId || !hash) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: entityType, entityId, hash'
      });
    }
    
    const key = `ledger:${entityType}:${entityId}`;
    const record = {
      entityType,
      entityId,
      hash,
      timestamp: timestamp || new Date().toISOString(),
      metadata: metadata || {},
      blockNumber: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    if (db instanceof Map) {
      db.set(key, record);
    } else {
      await db.put(key, record);
    }
    
    console.log(`✅ Private ledger: Recorded ${entityType} ${entityId}`);
    
    res.json({
      success: true,
      recordId: key,
      hash,
      blockNumber: record.blockNumber,
      timestamp: record.timestamp
    });
  } catch (error) {
    console.error('Ledger record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record on private ledger',
      error: error.message
    });
  }
});

app.get('/api/ledger/verify/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const key = `ledger:${entityType}:${entityId}`;
    
    let record = null;
    if (db instanceof Map) {
      record = db.get(key) || null;
    } else {
      try {
        record = await db.get(key);
      } catch (error) {
        record = null;
      }
    }
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found on private ledger'
      });
    }
    
    res.json({
      success: true,
      hash: record.hash,
      timestamp: record.timestamp,
      blockNumber: record.blockNumber,
      metadata: record.metadata
    });
  } catch (error) {
    console.error('Ledger verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify record',
      error: error.message
    });
  }
});

app.post('/verify', async (req, res) => {
  try {
    const { claimId, policyId, userId, severity, mlReportCID } = req.body;
    
    if (!claimId || !policyId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: claimId, policyId, userId'
      });
    }
    
    console.log(`🔍 Verifying claim ${claimId} (severity: ${severity})`);
    
    // Run all validation checks
    const [policyCheck, fraudCheck, policeCheck, agentCheck] = await Promise.all([
      validationRules.checkPolicyValidity(policyId),
      validationRules.checkFraudHistory(userId),
      validationRules.checkPoliceStatus(claimId),
      validationRules.checkAgentReview(claimId, severity)
    ]);
    
    // Decision logic
    let verified = false;
    let reason = '';
    
    if (!policyCheck.valid) {
      verified = false;
      reason = 'Policy is not valid';
    } else if (fraudCheck.hasFraud && fraudCheck.count > 2) {
      verified = false;
      reason = `Fraud history detected (${fraudCheck.count} records)`;
    } else if (!policeCheck.verified) {
      verified = false;
      reason = 'Police verification failed';
    } else if (agentCheck.requiresReview && !agentCheck.autoApproved) {
      verified = false;
      reason = 'Requires agent review';
    } else {
      verified = true;
      reason = 'All checks passed';
    }
    
    // Store verification result
    const verificationData = {
      claimId,
      policyId,
      userId,
      severity,
      mlReportCID,
      verified,
      reason,
      checks: {
        policy: policyCheck,
        fraud: fraudCheck,
        police: policeCheck,
        agent: agentCheck
      }
    };
    
    await storeVerification(claimId, verificationData);
    
    res.json({
      success: true,
      verified,
      reason,
      verificationData
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
});

app.get('/verification/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const verification = await getVerification(claimId);
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }
    
    res.json({
      success: true,
      verification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching verification',
      error: error.message
    });
  }
});

// Admin endpoint to add fraud record (for testing)
app.post('/admin/fraud', (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    if (!fraudRecords.has(userId)) {
      fraudRecords.set(userId, []);
    }
    
    fraudRecords.get(userId).push({
      reason,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Fraud record added',
      totalRecords: fraudRecords.get(userId).length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding fraud record',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Fabric Simulator running on http://localhost:${PORT}`);
  console.log(`📝 Private ledger: ${dbPath}`);
});

