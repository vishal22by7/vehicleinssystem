// Suppress ethers errors BEFORE importing ethers (critical!)
// This must happen before ethers.JsonRpcProvider is used anywhere
const originalError = console.error;
const originalWarn = console.warn;
console.error = function(...args) {
  const msg = args[0]?.toString() || '';
  if (msg.includes('JsonRpcProvider failed to detect network')) return;
  originalError.apply(console, args);
};
console.warn = function(...args) {
  const msg = args[0]?.toString() || '';
  if (msg.includes('JsonRpcProvider failed to detect network')) return;
  originalWarn.apply(console, args);
};

const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Try to load contract artifacts, but handle if they don't exist yet
let InsuranceLedger = null;
let VehicleInsurance = null;

const logBlockchainTx = (label, entityId, tx, receipt, extra = '') => {
  const valueWei = typeof tx.value === 'bigint' ? tx.value : 0n;
  const valueStr = valueWei === 0n
    ? 'value=0 ETH (state update only)'
    : `value=${ethers.formatEther(valueWei)} ETH`;

  const gasPrice = tx.gasPrice ?? tx.maxFeePerGas ?? 0n;
  const feeStr = gasPrice > 0n
    ? `fee≈${ethers.formatEther(receipt.gasUsed * gasPrice)} ETH`
    : null;

  const parts = [
    `${label} blockchain tx confirmed`,
    `id=${entityId}`,
    `txHash=${receipt.hash}`,
    valueStr
  ];

  if (feeStr) {
    parts.push(feeStr);
  }
  if (extra) {
    parts.push(extra);
  }

  console.log(`🔗 ${parts.join(' | ')}`);
};

const ledgerPath = path.join(__dirname, '../../smart-contracts/artifacts/contracts/InsuranceLedger.sol/InsuranceLedger.json');
const vehiclePath = path.join(__dirname, '../../smart-contracts/artifacts/contracts/VehicleInsurance.sol/VehicleInsurance.json');

if (fs.existsSync(ledgerPath)) {
  InsuranceLedger = require(ledgerPath);
}
if (fs.existsSync(vehiclePath)) {
  VehicleInsurance = require(vehiclePath);
}

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.contractAddress = process.env.SMART_CONTRACT_ADDRESS;
    this.fiatPerEth = parseFloat(process.env.FIAT_PER_ETH || '250000');
    if (!Number.isFinite(this.fiatPerEth) || this.fiatPerEth <= 0) {
      console.warn('⚠️  Invalid FIAT_PER_ETH value, defaulting to 250000');
      this.fiatPerEth = 250000;
    }
    this.init();
  }

  async init(retryCount = 0) {
    const maxRetries = 5;
    const retryDelay = 10000; // 10 seconds

    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

      // Check if private key is set and valid (not a placeholder)
      if (!privateKey || 
          privateKey === 'your-private-key-here' || 
          privateKey === '0xyour-private-key-here' ||
          privateKey.length < 64) {
        if (retryCount === 0) {
          console.warn('⚠️  Blockchain private key not set or invalid, blockchain features disabled');
          console.warn('   To enable blockchain: Set BLOCKCHAIN_PRIVATE_KEY in .env with a valid private key');
        }
        return;
      }

      // Check if blockchain node is available before creating provider
      let nodeAvailable = false;
      try {
        const axios = require('axios');
        await axios.post(rpcUrl, {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }, { timeout: 2000 });
        nodeAvailable = true;
      } catch (connectionError) {
        // Node not available - retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          if (retryCount === 0) {
            console.warn('⚠️  Blockchain node not available at ' + rpcUrl);
            console.warn('   Will retry connection in background...');
            console.warn('   Start Hardhat node with: cd smart-contracts && npx hardhat node');
          }
          // Retry after delay
          setTimeout(() => {
            this.init(retryCount + 1);
          }, retryDelay);
          return;
        } else {
          console.warn('⚠️  Blockchain node still not available after ' + maxRetries + ' attempts');
          console.warn('   Blockchain features disabled. Start Hardhat node with: cd smart-contracts && npx hardhat node');
          return;
        }
      }

      // Only create provider if node is available
      if (!nodeAvailable) {
        return;
      }

      // If we're retrying and successfully connected, log success
      if (retryCount > 0) {
        console.log('✅ Blockchain node is now available! Reconnecting...');
      }

      try {
        // Validate private key format and create provider
        // Error suppression is handled globally in server.js
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      } catch (walletError) {
        console.warn('⚠️  Invalid blockchain private key format, blockchain features disabled');
        console.warn('   Error:', walletError.message);
        return;
      }

      // Try to use VehicleInsurance contract first, fallback to InsuranceLedger
      if (this.contractAddress) {
        if (VehicleInsurance && VehicleInsurance.abi) {
          this.contract = new ethers.Contract(
            this.contractAddress,
            VehicleInsurance.abi,
            this.wallet
          );
          this.contractType = 'VehicleInsurance';
          console.log('✅ Blockchain service initialized with VehicleInsurance contract');
        } else if (InsuranceLedger && InsuranceLedger.abi) {
          this.contract = new ethers.Contract(
            this.contractAddress,
            InsuranceLedger.abi,
            this.wallet
          );
          this.contractType = 'InsuranceLedger';
          console.log('✅ Blockchain service initialized with InsuranceLedger contract');
        } else {
          console.warn('⚠️  Smart contract not deployed yet or artifact not found');
        }
      } else {
        console.warn('⚠️  Smart contract address not set');
      }
    } catch (error) {
      console.error('Blockchain initialization error:', error);
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

  async issuePolicy(policyId, userId, premium, startDate, endDate) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const premiumWei = this.getPremiumWei(premium);
      const premiumEth = Number(premium) / this.fiatPerEth;

      const tx = await this.contract.issuePolicy(
        policyId,
        userId,
        premiumWei,
        Math.floor(new Date(startDate).getTime() / 1000),
        Math.floor(new Date(endDate).getTime() / 1000),
        { value: premiumWei }
      );

      const receipt = await tx.wait();
      logBlockchainTx(
        'Policy',
        policyId,
        tx,
        receipt,
        `premiumFiat=${premium} INR | premiumEth=${premiumEth.toFixed(6)} ETH`
      );
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Blockchain issuePolicy error:', error);
      throw error;
    }
  }

  async submitClaim(claimId, policyId, userId, description, ipfsCids) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const tx = await this.contract.submitClaim(
        claimId,
        policyId,
        userId,
        description,
        ipfsCids
      );

      const receipt = await tx.wait();
      logBlockchainTx('Claim', claimId, tx, receipt);
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Blockchain submitClaim error:', error);
      throw error;
    }
  }

  async submitClaimWithML(claimId, policyId, userId, description, evidenceCids, mlReportCID, severity) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      // Use new VehicleInsurance contract if available
      if (this.contractType === 'VehicleInsurance') {
        const tx = await this.contract.submitClaim(
          claimId,
          policyId,
          userId,
          description,
          evidenceCids,
          mlReportCID || '',
          severity || 0
        );

        const receipt = await tx.wait();
        logBlockchainTx('Claim (ML)', claimId, tx, receipt, `severity=${severity || 0}`);
        
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          timestamp: new Date()
        };
      } else {
        // Fallback to old contract
        return await this.submitClaim(claimId, policyId, userId, description, evidenceCids);
      }
    } catch (error) {
      console.error('Blockchain submitClaimWithML error:', error);
      throw error;
    }
  }

  async updateClaimStatus(claimId, newStatus) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const statusMap = {
        'Submitted': 0,
        'In Review': 1,
        'Approved': 2,
        'Rejected': 3
      };

      const statusCode = statusMap[newStatus];
      if (statusCode === undefined) {
        throw new Error('Invalid status');
      }

      const tx = await this.contract.updateClaimStatus(claimId, statusCode);
      const receipt = await tx.wait();
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Blockchain updateClaimStatus error:', error);
      throw error;
    }
  }

  isAvailable() {
    return this.contract !== null;
  }
}

module.exports = new BlockchainService();

