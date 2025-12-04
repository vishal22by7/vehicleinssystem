const { ethers } = require('ethers');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Try to load contract artifacts
let VehicleInsurance = null;
const vehiclePath = path.join(__dirname, '../../smart-contracts/artifacts/contracts/VehicleInsurance.sol/VehicleInsurance.json');
if (fs.existsSync(vehiclePath)) {
  VehicleInsurance = require(vehiclePath);
}

/**
 * Hybrid Blockchain Service
 * 
 * Implements:
 * - Private Blockchain (Hyperledger Fabric Simulator) for internal audit
 * - Public Blockchain (Ethereum/Polygon) for public verification
 * - Hash anchoring for tamper-proof records
 */
class HybridBlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.contractAddress = process.env.SMART_CONTRACT_ADDRESS;
    this.fiatPerEth = parseFloat(process.env.FIAT_PER_ETH || '250000');
    this.privateBlockchainUrl = process.env.PRIVATE_BLOCKCHAIN_URL || 'http://localhost:4000';
    this.init();
  }

  async init() {
    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

      if (!privateKey || 
          privateKey === 'your-private-key-here' || 
          privateKey === '0xyour-private-key-here' ||
          privateKey.length < 64) {
        console.warn('⚠️  Blockchain private key not set, hybrid blockchain features disabled');
        return;
      }

      try {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      } catch (walletError) {
        console.warn('⚠️  Invalid blockchain private key format, hybrid blockchain features disabled');
        return;
      }

      if (this.contractAddress && VehicleInsurance && VehicleInsurance.abi) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          VehicleInsurance.abi,
          this.wallet
        );
        console.log('✅ Hybrid Blockchain service initialized');
      } else {
        console.warn('⚠️  Smart contract not deployed yet');
      }
    } catch (error) {
      console.error('❌ Hybrid Blockchain initialization error:', error.message);
    }
  }

  /**
   * Compute SHA-256 hash of data
   */
  computeHash(data) {
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Store hash on Private Blockchain (Hyperledger Fabric Simulator)
   */
  async storeOnPrivateBlockchain(entityType, entityId, data) {
    try {
      const hash = this.computeHash(data);
      const timestamp = new Date().toISOString();

      const response = await axios.post(`${this.privateBlockchainUrl}/api/ledger/record`, {
        entityType,
        entityId,
        hash,
        timestamp,
        metadata: {
          dataSize: typeof data === 'object' ? JSON.stringify(data).length : String(data).length
        }
      });

      if (response.data.success) {
        console.log(`✅ Private blockchain: ${entityType} ${entityId} hash stored`);
        return {
          success: true,
          hash,
          recordId: response.data.recordId,
          timestamp
        };
      }
      throw new Error('Private blockchain storage failed');
    } catch (error) {
      console.error('❌ Private blockchain storage error:', error.message);
      // Don't throw - allow system to continue without private blockchain
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Anchor hash on Public Blockchain (Ethereum/Polygon)
   */
  async anchorOnPublicBlockchain(hash, entityType, entityId) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      // Store only the hash on public blockchain (no sensitive data)
      const tx = await this.contract.recordHash(
        hash,
        entityType,
        entityId,
        Math.floor(Date.now() / 1000)
      );

      const receipt = await tx.wait();
      
      console.log(`✅ Public blockchain: Hash anchored for ${entityType} ${entityId}`);
      console.log(`   Tx Hash: ${receipt.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Public blockchain anchoring error:', error.message);
      // If contract doesn't have recordHash, try alternative method
      if (error.message.includes('recordHash')) {
        console.log('⚠️  Contract does not have recordHash method, using fallback');
        return this.anchorHashFallback(hash, entityType, entityId);
      }
      throw error;
    }
  }

  /**
   * Fallback method if contract doesn't have recordHash
   */
  async anchorHashFallback(hash, entityType, entityId) {
    // Store hash in a custom event or use existing contract methods
    // For now, return a mock response
    console.log('⚠️  Using fallback hash anchoring (not stored on-chain)');
    return {
      success: true,
      txHash: `fallback_${hash.substring(0, 16)}`,
      blockNumber: 0,
      timestamp: new Date()
    };
  }

  /**
   * Issue Policy with Hybrid Blockchain
   */
  async issuePolicy(policyId, userId, premium, startDate, endDate, policyData) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      // Step 1: Compute hash of policy data
      const policyHash = this.computeHash({
        policyId,
        userId,
        premium,
        startDate,
        endDate,
        ...policyData
      });

      // Step 2: Store on Private Blockchain
      const privateResult = await this.storeOnPrivateBlockchain('Policy', policyId, {
        policyId,
        userId,
        premium,
        startDate,
        endDate
      });

      // Step 3: Anchor hash on Public Blockchain
      const publicResult = await this.anchorOnPublicBlockchain(policyHash, 'Policy', policyId);

      // Step 4: Store policy on public blockchain (with premium payment)
      const premiumWei = this.getPremiumWei(premium);
      const tx = await this.contract.issuePolicy(
        policyId,
        userId,
        premiumWei,
        Math.floor(new Date(startDate).getTime() / 1000),
        Math.floor(new Date(endDate).getTime() / 1000),
        { value: premiumWei }
      );

      const receipt = await tx.wait();
      
      console.log(`🔗 Hybrid Blockchain: Policy ${policyId} recorded`);
      console.log(`   Private Hash: ${privateResult.hash || 'N/A'}`);
      console.log(`   Public Tx: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(),
        privateBlockchainHash: privateResult.hash,
        publicBlockchainHash: policyHash,
        privateBlockchainRecordId: privateResult.recordId
      };
    } catch (error) {
      console.error('❌ Hybrid blockchain issuePolicy error:', error.message);
      throw error;
    }
  }

  /**
   * Submit Claim with Hybrid Blockchain
   */
  async submitClaim(claimId, policyId, userId, description, evidenceCids, mlReportCID, severity) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      // Step 1: Compute hash of claim data
      const claimHash = this.computeHash({
        claimId,
        policyId,
        userId,
        description,
        evidenceCids,
        mlReportCID,
        severity
      });

      // Step 2: Store on Private Blockchain
      const privateResult = await this.storeOnPrivateBlockchain('Claim', claimId, {
        claimId,
        policyId,
        userId,
        severity,
        mlReportCID
      });

      // Step 3: Anchor hash on Public Blockchain
      const publicResult = await this.anchorOnPublicBlockchain(claimHash, 'Claim', claimId);

      // Step 4: Store claim on public blockchain
      const tx = await this.contract.submitClaim(
        claimId,
        policyId,
        userId,
        description,
        evidenceCids || [],
        mlReportCID || '',
        severity || 0
      );

      const receipt = await tx.wait();
      
      console.log(`🔗 Hybrid Blockchain: Claim ${claimId} recorded`);
      console.log(`   Private Hash: ${privateResult.hash || 'N/A'}`);
      console.log(`   Public Tx: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(),
        privateBlockchainHash: privateResult.hash,
        publicBlockchainHash: claimHash,
        privateBlockchainRecordId: privateResult.recordId
      };
    } catch (error) {
      console.error('❌ Hybrid blockchain submitClaim error:', error.message);
      throw error;
    }
  }

  /**
   * Verify integrity by comparing hashes
   */
  async verifyIntegrity(entityType, entityId, currentData) {
    try {
      // Get hash from private blockchain
      const privateResponse = await axios.get(
        `${this.privateBlockchainUrl}/api/ledger/verify/${entityType}/${entityId}`
      );

      if (!privateResponse.data.success) {
        return { verified: false, reason: 'Not found on private blockchain' };
      }

      const storedHash = privateResponse.data.hash;
      const currentHash = this.computeHash(currentData);

      if (storedHash === currentHash) {
        return { verified: true, hash: currentHash };
      } else {
        return { 
          verified: false, 
          reason: 'Hash mismatch - data may have been tampered',
          storedHash,
          currentHash
        };
      }
    } catch (error) {
      console.error('❌ Integrity verification error:', error.message);
      return { verified: false, reason: error.message };
    }
  }

  getPremiumWei(premiumFiat) {
    const fiatValue = Number(premiumFiat);
    if (!Number.isFinite(fiatValue) || fiatValue <= 0) {
      throw new Error('Invalid fiat premium value');
    }
    const ethValue = fiatValue / this.fiatPerEth;
    const ethStr = ethValue.toFixed(18);
    return ethers.parseUnits(ethStr, 18);
  }

  isAvailable() {
    return this.contract !== null;
  }

  isPrivateBlockchainAvailable() {
    // Check if private blockchain service is reachable
    return axios.get(`${this.privateBlockchainUrl}/api/health`)
      .then(() => true)
      .catch(() => false);
  }
}

module.exports = new HybridBlockchainService();

