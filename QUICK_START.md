# ⚡ Quick Start Guide - VIMS Project

**Get up and running in 10 minutes!**

---

## 🎯 Prerequisites Check

Before starting, make sure you have:

- ✅ **Node.js** (v18+) - [Download](https://nodejs.org/)
- ✅ **PostgreSQL** - [Download](https://www.postgresql.org/download/)
- ✅ **Git** - [Download](https://git-scm.com/downloads)

**Verify installations:**
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
psql --version    # Should show PostgreSQL version
```

---

## 🚀 5-Minute Setup

### Step 1: Get the Project
```bash
# Clone or copy the project folder
cd path/to/your/projects
git clone <repository-url> vims-project
cd vims-project
```

### Step 2: Install Dependencies
```bash
npm run install-all
```
⏱️ Takes 5-10 minutes

### Step 3: Setup Database

**Create PostgreSQL database:**
```bash
# Windows PowerShell
psql -U postgres
# In PostgreSQL prompt:
CREATE DATABASE vims;
\q

# macOS/Linux
sudo -u postgres psql
CREATE DATABASE vims;
\q
```

**Or use pgAdmin4:**
- Right-click "Databases" → "Create" → "Database..."
- Name: `vims` → Save

### Step 4: Configure Environment

**Run setup script (Windows PowerShell):**
```powershell
.\setup-project.ps1
```

**Or manually create `backend/.env`:**
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=vims
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

JWT_SECRET=your-random-secret-key-here
JWT_EXPIRE=7d
```

**⚠️ Replace `your_postgres_password_here` with your PostgreSQL password!**

### Step 5: Setup Blockchain (REQUIRED)

**🚨 IMPORTANT: Blockchain is a core part of this project. Without it, many features won't work!**

**Step 5a: Start Hardhat Blockchain Node**

**Terminal 1 - Blockchain (Start this FIRST):**
```bash
cd smart-contracts
npx hardhat node
```

✅ Wait for: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

**Keep this terminal open!** The blockchain node must stay running.

**Step 5b: Copy Private Key**

When Hardhat starts, it shows test accounts. **Copy one private key** (the long hex string starting with `0x`).

Example:
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Step 5c: Deploy Smart Contract**

**Terminal 2 - Deploy Contract:**
```bash
cd smart-contracts
npm run deploy
```

**Copy the deployed contract address** from the output.

**Step 5d: Update Backend .env**

Add to `backend/.env`:
```env
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
SMART_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Replace with your actual values!**

**📖 For detailed instructions, see:** `smart-contracts/DEPLOY_INSTRUCTIONS.md`

**🔍 Verify blockchain setup:**
```bash
node utils/check-blockchain-setup.js
```

### Step 6: Start Services

**Terminal 3 - Backend:**
```bash
cd backend
npm run dev
```
✅ Wait for: `🚀 Server running on http://localhost:5000`

**Terminal 4 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Wait for: `Local: http://localhost:3000`

**💡 Note:** You can also use `npm start` - it will automatically use dev mode if no production build exists.

**💡 Quick Start All Services:**
```bash
# Windows
start-all.bat

# Or use the Node.js version (waits for blockchain)
node start-all-with-blockchain.js
```

### Step 7: Initialize Data

**In a new terminal:**
```bash
cd backend

# Seed policy types
npm run seed-policy-types

# Create admin user
npm run create-admin
# Follow prompts: admin@vims.com / admin123

# Create test user
npm run create-test-user
# Creates: test@test.com / test123
```

---

## ✅ Verify Setup

1. **Blockchain:** Check Terminal 1 shows `Started HTTP and WebSocket JSON-RPC server`
   - Or run: `node utils/check-blockchain-setup.js`

2. **Backend:** http://localhost:5000/api/health
   - Should return: `{"status": "ok"}`
   - Should show: `✅ Blockchain service initialized` (if blockchain is configured)

3. **Frontend:** http://localhost:3000
   - Should show login page

4. **Login Test:**
   - Email: `test@test.com`
   - Password: `test123`

---

## 🎉 You're Ready!

**Default Login Credentials:**

| Role | Email | Password |
|------|-------|----------|
| **Test User** | `test@test.com` | `test123` |
| **Admin** | `admin@vims.com` | `admin123` (or what you set) |

---

## 🐛 Common Issues

### PostgreSQL not running
```powershell
# Windows
Get-Service postgresql*
Start-Service postgresql-x64-XX

# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### Port already in use
```powershell
# Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Database connection error
- Check `backend/.env` has correct `DB_PASSWORD`
- Verify database `vims` exists: `psql -U postgres -l`

---

## 📚 Need More Help?

- **Complete Guide:** See `COMPLETE_SETUP_GUIDE.md`
- **Database GUI:** See `PGADMIN4_SETUP_GUIDE.md`
- **View Data:** `cd backend && npm run view-db`

---

**Happy Coding! 🚀**

