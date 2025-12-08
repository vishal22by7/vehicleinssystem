/**
 * Development server launcher
 * This script starts all services using child_process instead of concurrently
 * to avoid the cmd.exe ENOENT error on Windows
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';

const services = [
  { name: 'BLOCKCHAIN', command: 'npm', args: ['run', 'dev:blockchain'], cwd: 'smart-contracts', color: '\x1b[36m' },
  { name: 'BACKEND', command: 'npm', args: ['run', 'dev'], cwd: 'backend', color: '\x1b[33m' },
  { name: 'FRONTEND', command: 'npm', args: ['run', 'dev'], cwd: 'frontend', color: '\x1b[32m' },
  { name: 'ML-ANALYZER', command: 'python', args: ['app.py'], cwd: 'ml-analyzer', color: '\x1b[35m' },
  { name: 'FABRIC', command: 'npm', args: ['start'], cwd: 'fabric-simulator', color: '\x1b[34m' },
  { name: 'ORACLE', command: 'npm', args: ['start'], cwd: 'oracle-service', color: '\x1b[31m' },
];

const processes = [];

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  VIMS - Starting All Services\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m\n');

services.forEach((service) => {
  const projectRoot = path.resolve(__dirname);
  const cwd = path.join(projectRoot, service.cwd);
  
  console.log(`${service.color}Starting ${service.name}...\x1b[0m`);
  
  const options = {
    cwd,
    shell: isWindows ? true : false,
    stdio: 'inherit',
    env: { ...process.env }
  };
  
  // On Windows, ensure cmd.exe is accessible
  if (isWindows && !process.env.ComSpec) {
    options.env.ComSpec = process.env.ComSpec || 'C:\\WINDOWS\\system32\\cmd.exe';
  }
  
  const proc = spawn(service.command, service.args, options);
  
  proc.on('error', (error) => {
    console.error(`\x1b[31m❌ Error starting ${service.name}: ${error.message}\x1b[0m`);
    console.error(`   Command: ${service.command} ${service.args.join(' ')}`);
    console.error(`   CWD: ${cwd}`);
  });
  
  processes.push({ name: service.name, process: proc });
});

// Handle cleanup
const cleanup = () => {
  console.log('\n\x1b[33mShutting down all services...\x1b[0m');
  processes.forEach(({ name, process }) => {
    try {
      if (isWindows) {
        process.kill('SIGTERM');
      } else {
        process.kill('SIGINT');
      }
    } catch (e) {
      // Process might already be dead
    }
  });
  setTimeout(() => process.exit(0), 1000);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log('\n\x1b[32m✅ All services started!\x1b[0m');

