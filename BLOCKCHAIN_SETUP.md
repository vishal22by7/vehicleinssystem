# 🔗 Blockchain Setup Guide

## Why Blockchain is Required

**Blockchain is a core component of this project.** Without it, many features will not work:
- Policy issuance on blockchain
- Claim submission and verification
- Immutable record keeping
- Smart contract interactions

## Quick Setup

### 1. Start Blockchain Node

```bash
cd smart-contracts
npx hardhat node
```

**Wait for:** `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

**Keep this terminal open!** The node must stay running.

### 2. Deploy Smart Contract

In a **new terminal**:

```bash
cd smart-contracts
npm run deploy
```

**Copy the contract address** from the output.

### 3. Configure Backend

Add to `backend/.env`:

```env
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=0x...  # Copy from Hardhat node output
SMART_CONTRACT_ADDRESS=0x...  # Copy from deploy output
```

### 4. Verify Setup

```bash
npm run check:blockchain
```

This will verify:
- ✅ Blockchain node is running
- ✅ Private key is configured
- ✅ Contract address is set

## Automated Startup

### Option 1: Using start-all.bat (Windows)

```bash
start-all.bat
```

This will:
1. Start blockchain node first
2. Wait for it to be ready
3. Start all other services

### Option 2: Using Node.js Script

```bash
npm run start:all
```

This provides better error handling and waits for blockchain readiness.

## Troubleshooting

### Blockchain Node Not Starting

**Error:** `Port 8545 already in use`

**Solution:**
```bash
# Find process using port 8545
netstat -ano | findstr :8545
# Kill the process
taskkill /PID <PID> /F
```

### Services Can't Connect to Blockchain

**Error:** `Blockchain node not available`

**Solution:**
1. Make sure Hardhat node is running
2. Check `backend/.env` has correct `BLOCKCHAIN_RPC_URL`
3. Run: `npm run check:blockchain`

### Contract Not Deployed

**Error:** `Smart contract address not set`

**Solution:**
1. Make sure Hardhat node is running
2. Deploy contract: `cd smart-contracts && npm run deploy`
3. Add address to `backend/.env`: `SMART_CONTRACT_ADDRESS=0x...`

## Automatic Retry

The backend services now **automatically retry** connecting to the blockchain if it becomes available later. This means:

- If you start services before blockchain, they will wait and retry
- If blockchain goes down and comes back, services will reconnect
- No need to restart services when blockchain becomes available

## Manual Checks

### Check if Blockchain is Running

```bash
npm run wait:blockchain
```

### Full Setup Check

```bash
npm run check:blockchain
```

## Next Steps

Once blockchain is set up:

1. ✅ Start all services: `start-all.bat` or `npm run start:all`
2. ✅ Verify backend shows: `✅ Blockchain service initialized`
3. ✅ Test policy creation (should interact with blockchain)
4. ✅ Test claim submission (should store on blockchain)

## Need Help?

- **Detailed Instructions:** See `smart-contracts/DEPLOY_INSTRUCTIONS.md`
- **Quick Start:** See `QUICK_START.md`
- **Complete Guide:** See `COMPLETE_SETUP_GUIDE.md`

