/**
 * Start all services with blockchain readiness check
 * This ensures blockchain node is ready before starting other services
 */

const { spawn } = require('child_process');
const path = require('path');
const { waitForBlockchain } = require('./utils/wait-for-blockchain');

const isWindows = process.platform === 'win32';

const services = [
  {
    name: 'BLOCKCHAIN',
    command: 'npx',
    args: ['hardhat', 'node'],
    cwd: 'smart-contracts',
    wait: false // Don't wait for this one
  },
  {
    name: 'BACKEND',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: 'backend',
    wait: true // Wait for blockchain before starting
  },
  {
    name: 'FRONTEND',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: 'frontend',
    wait: true
  },
  {
    name: 'ML-SERVICE',
    command: 'python',
    args: ['app.py'],
    cwd: 'service',
    wait: true
  },
  {
    name: 'FABRIC',
    command: 'npm',
    args: ['start'],
    cwd: 'fabric-simulator',
    wait: true
  },
  {
    name: 'ORACLE',
    command: 'npm',
    args: ['start'],
    cwd: 'oracle-service',
    wait: true
  },
];

const processes = [];

function startService(service) {
  const projectRoot = path.resolve(__dirname);
  const cwd = path.join(projectRoot, service.cwd);

  console.log(`\n🚀 Starting ${service.name}...`);

  const options = {
    cwd,
    shell: isWindows,
    stdio: 'inherit',
    env: { ...process.env }
  };

  const proc = spawn(service.command, service.args, options);

  proc.on('error', (error) => {
    console.error(`❌ Error starting ${service.name}: ${error.message}`);
  });

  processes.push({ name: service.name, process: proc });
}

async function main() {
  console.log('========================================');
  console.log('  VIMS - Starting All Services');
  console.log('  (With Blockchain Readiness Check)');
  console.log('========================================\n');

  // Start blockchain first
  const blockchainService = services.find(s => s.name === 'BLOCKCHAIN');
  startService(blockchainService);

  // Wait for blockchain to be ready
  console.log('\n⏳ Waiting for blockchain node to initialize...');
  const blockchainReady = await waitForBlockchain();

  if (!blockchainReady) {
    console.error('\n❌ Blockchain node failed to start. Other services may not work correctly.');
    console.error('   Continuing anyway, but blockchain features will be disabled.\n');
  }

  // Start other services
  const otherServices = services.filter(s => s.name !== 'BLOCKCHAIN');
  otherServices.forEach(service => {
    startService(service);
  });

  // Handle cleanup
  const cleanup = () => {
    console.log('\n\n🛑 Shutting down all services...');
    processes.forEach(({ name, process }) => {
      try {
        process.kill(isWindows ? 'SIGTERM' : 'SIGINT');
      } catch (e) {
        // Process might already be dead
      }
    });
    setTimeout(() => process.exit(0), 2000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log('\n✅ All services started!');
  console.log('   Press Ctrl+C to stop all services\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

