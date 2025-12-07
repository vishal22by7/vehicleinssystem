/**
 * Wait for Hardhat blockchain node to be ready
 * This script checks if the blockchain node is responding on port 8545
 * before allowing other services to start
 */

const axios = require('axios');

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
const MAX_RETRIES = 30; // 30 seconds max wait
const RETRY_DELAY = 1000; // 1 second between retries

async function checkBlockchainReady() {
  try {
    const response = await axios.post(RPC_URL, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    }, { timeout: 2000 });
    
    if (response.data && response.data.result) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function waitForBlockchain() {
  console.log('⏳ Waiting for blockchain node to be ready...');
  console.log(`   Checking: ${RPC_URL}`);
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    const isReady = await checkBlockchainReady();
    
    if (isReady) {
      console.log('✅ Blockchain node is ready!');
      return true;
    }
    
    if (i < MAX_RETRIES - 1) {
      process.stdout.write(`   Attempt ${i + 1}/${MAX_RETRIES}...\r`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  console.error('\n❌ Blockchain node is not ready after 30 seconds');
  console.error('   Make sure Hardhat node is running: cd smart-contracts && npx hardhat node');
  return false;
}

// If run directly (not imported)
if (require.main === module) {
  waitForBlockchain()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = { waitForBlockchain, checkBlockchainReady };

