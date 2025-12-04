# Smart Contract Deployment Instructions

## Step 1: Start Hardhat Local Node

**Open a NEW terminal window** and run:

```bash
cd smart-contracts
npm run node
```

**Wait for this message:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

**Keep this terminal window open!** The node must be running.

## Step 2: Copy Private Key

When Hardhat node starts, it will display test accounts with private keys. 

**Copy one of the private keys** (the long hex string starting with `0x`).

Example output:
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Step 3: Update Backend .env

Add the private key to `backend/.env`:

```env
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Step 4: Deploy Contract

**Open ANOTHER terminal window** and run:

```bash
cd smart-contracts
npm run deploy
```

**Copy the deployed contract address** from the output.

Example:
```
✅ InsuranceLedger deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Step 5: Update Backend .env Again

Add the contract address to `backend/.env`:

```env
SMART_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Troubleshooting

### Error: "Cannot connect to the network localhost"
- **Solution**: Make sure Hardhat node is running (Step 1)
- Check that you see "Started HTTP and WebSocket JSON-RPC server" message

### Error: "ECONNREFUSED 127.0.0.1:8545"
- **Solution**: Hardhat node is not running on port 8545
- Start the node first: `npm run node`

### Contract deployment fails
- Make sure you're using the correct network: `--network localhost`
- Verify Hardhat node is still running
- Check that you have enough ETH in the account (Hardhat test accounts have 10000 ETH by default)

## Quick Commands Summary

**Terminal 1 (Hardhat Node - Keep Running):**
```bash
cd smart-contracts
npm run node
```

**Terminal 2 (Deploy Contract):**
```bash
cd smart-contracts
npm run deploy
```

**Terminal 3 (Backend Server):**
```bash
cd backend
npm run dev
```

**Terminal 4 (Frontend):**
```bash
cd frontend
npm start
```

