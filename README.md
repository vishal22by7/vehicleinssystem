# 🚗 Vehicle Insurance Management System (VIMS)

A blockchain-integrated vehicle insurance management system with IPFS file storage, built with Next.js, Node.js, PostgreSQL, Sequelize, Hardhat, and IPFS.

## 📋 Features

### User Features

- ✅ User registration and authentication
- ✅ Premium calculator
- ✅ Buy insurance policies
- ✅ Submit insurance claims with photo uploads
- ✅ Track claim status
- ✅ View policies and claims

### Admin Features

- ✅ Admin dashboard with statistics
- ✅ Manage policy types
- ✅ View all users, policies, and claims
- ✅ Review and approve/reject claims
- ✅ Update claim workflow status

### Blockchain Integration

- ✅ Immutable policy issuance records
- ✅ Immutable claim submission records
- ✅ Claim status update tracking
- ✅ IPFS CID storage on blockchain

## 🏗️ Architecture

- **Frontend**: Next.js 14 (localhost:3000)
- **Backend**: Node.js + Express (localhost:5000)
- **Database**: PostgreSQL (localhost:5432)
- **ORM**: Sequelize
- **Blockchain**: Hardhat Local Node (localhost:8545)
- **IPFS**: Local IPFS Node (localhost:5001)

## 📦 Prerequisites (Windows)

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14+) - [Download](https://www.postgresql.org/download/windows/)
- **Git** - [Download](https://git-scm.com/download/win)
- **PowerShell** (comes with Windows 10/11)

## 🚀 Quick Start (Windows)

**For detailed step-by-step instructions, see:** **[COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)**

### Quick Setup Steps:

1. **Install dependencies:**

   ```powershell
   npm run install-all
   ```

2. **Create PostgreSQL database:**

   ```powershell
   psql -U postgres -c "CREATE DATABASE vims;"
   ```

3. **Configure environment:**

   ```powershell
   # Copy backend\.env.example to backend\.env
   # and update DB_PASSWORD with your PostgreSQL password
   ```

4. **Start services:**

   ```powershell
   # Option 1: Use start script (opens separate windows)
   .\start-all.ps1

   # Option 2: Use single command (all in one terminal)
   npm run dev

   # Option 3: Manual (separate terminals)
   # Terminal 1:
   cd backend
   npm run dev

   # Terminal 2:
   cd frontend
   npm run dev
   ```

5. **Initialize data:**

   ```powershell
   cd backend
   npm run seed-policy-types
   npm run create-admin
   npm run create-test-user
   ```

6. **Access application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api/health
   - Login: `test@test.com` / `test123`

## ⚙️ Configuration

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and update:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vims
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Blockchain (Optional)
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=your-private-key-here
SMART_CONTRACT_ADDRESS=your-contract-address-here

# IPFS (Optional)
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080/ipfs
```

### Frontend Environment Variables

Copy `frontend/.env.example` to `frontend/.env.local` (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📁 Project Structure

```
vims-project/
├── backend/
│   ├── models/sequelize/  # Sequelize models (PostgreSQL)
│   ├── routes/            # API routes
│   ├── services/          # Blockchain & IPFS services
│   ├── middleware/        # Auth middleware
│   ├── scripts/           # Database scripts
│   ├── uploads/           # File uploads directory
│   └── server.js          # Express server
├── frontend/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   ├── context/           # React context (Auth, Theme)
│   └── public/
├── smart-contracts/
│   ├── contracts/         # Solidity contracts
│   ├── scripts/           # Deployment scripts
│   └── hardhat.config.js
├── COMPLETE_SETUP_GUIDE.md  # Detailed Windows setup guide
├── QUICK_START.md           # Quick start guide
└── README.md
```

## 🔐 Security Notes

- **Never commit `.env` files** - They contain sensitive information
- **JWT_SECRET**: Use a strong, random secret in production
- **BLOCKCHAIN_PRIVATE_KEY**: Keep this secure! Never commit to git
- **DB_PASSWORD**: Use strong passwords in production
- **CORS**: Update `FRONTEND_URL` for production deployment

## 🐛 Troubleshooting

### PostgreSQL Connection Error

```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start PostgreSQL service
Start-Service postgresql-x64-XX  # Replace XX with version

# Test connection
psql -U postgres -d vims
```

### Port Already in Use

```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F
```

### Frontend Can't Connect to Backend

- Verify backend is running: http://localhost:5000/api/health
- Check `FRONTEND_URL` in `backend/.env`
- Check browser console for errors (F12)

## 📚 Documentation

- **[COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)** - Complete Windows setup guide
- **[QUICK_START.md](./QUICK_START.md)** - Quick 10-minute setup
- **[GITHUB_PUSH_GUIDE.md](./GITHUB_PUSH_GUIDE.md)** - How to push to GitHub

## 📝 API Endpoints

### Auth

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Policies

- `GET /api/policies` - Get user's policies
- `GET /api/policies/:id` - Get policy by ID
- `POST /api/policies/buy` - Buy policy

### Claims

- `GET /api/claims` - Get user's claims
- `GET /api/claims/:id` - Get claim by ID
- `POST /api/claims/submit` - Submit claim (multipart/form-data)

### Calculator

- `GET /api/calculator/policy-types` - Get policy types
- `POST /api/calculator/premium` - Calculate premium

### Admin

- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/policy-types` - Get policy types
- `POST /api/admin/policy-types` - Create policy type
- `PUT /api/admin/policy-types/:id` - Update policy type
- `DELETE /api/admin/policy-types/:id` - Delete policy type
- `GET /api/admin/users` - Get all users
- `GET /api/admin/policies` - Get all policies
- `GET /api/admin/claims` - Get all claims
- `PUT /api/admin/claims/:id/status` - Update claim status
