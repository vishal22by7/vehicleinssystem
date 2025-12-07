/**
 * Check if blockchain is properly configured
 * Verifies:
 * 1. Blockchain node is running
 * 2. Private key is set in .env
 * 3. Contract address is set in .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
const BACKEND_ENV_PATH = path.join(__dirname, '../backend/.env');

async function checkBlockchainNode() {
  try {
    const response = await axios.post(RPC_URL, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    }, { timeout: 2000 });
    
    if (response.data && response.data.result) {
      const blockNumber = parseInt(response.data.result, 16);
      console.log(`✅ Blockchain node is running (Block #${blockNumber})`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Blockchain node is not running');
    console.error(`   URL: ${RPC_URL}`);
    console.error('   Start it with: cd smart-contracts && npx hardhat node');
    return false;
  }
}

function checkEnvConfig() {
  if (!fs.existsSync(BACKEND_ENV_PATH)) {
    console.error('❌ backend/.env file not found');
    return { privateKey: false, contractAddress: false };
  }

  const envContent = fs.readFileSync(BACKEND_ENV_PATH, 'utf8');
  const hasPrivateKey = /BLOCKCHAIN_PRIVATE_KEY\s*=\s*0x[a-fA-F0-9]{64}/.test(envContent);
  const hasContractAddress = /SMART_CONTRACT_ADDRESS\s*=\s*0x[a-fA-F0-9]{40}/.test(envContent);

  if (hasPrivateKey) {
    console.log('✅ BLOCKCHAIN_PRIVATE_KEY is set');
  } else {
    console.error('❌ BLOCKCHAIN_PRIVATE_KEY is not set or invalid');
    console.error('   Get a private key from Hardhat node output');
    console.error('   Add to backend/.env: BLOCKCHAIN_PRIVATE_KEY=0x...');
  }

  if (hasContractAddress) {
    console.log('✅ SMART_CONTRACT_ADDRESS is set');
  } else {
    console.error('❌ SMART_CONTRACT_ADDRESS is not set or invalid');
    console.error('   Deploy contract: cd smart-contracts && npm run deploy');
    console.error('   Add to backend/.env: SMART_CONTRACT_ADDRESS=0x...');
  }

  return { privateKey: hasPrivateKey, contractAddress: hasContractAddress };
}

async function main() {
  console.log('🔍 Checking blockchain setup...\n');
  
  const nodeReady = await checkBlockchainNode();
  console.log('');
  
  const envConfig = checkEnvConfig();
  console.log('');
  
  if (nodeReady && envConfig.privateKey && envConfig.contractAddress) {
    console.log('🎉 Blockchain is fully configured and ready!');
    process.exit(0);
  } else {
    console.log('⚠️  Blockchain setup is incomplete');
    console.log('\n📖 See smart-contracts/DEPLOY_INSTRUCTIONS.md for setup guide');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});

