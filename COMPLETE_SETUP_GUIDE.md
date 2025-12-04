# 🚀 Complete Setup Guide - VIMS Project (Windows)

**Complete step-by-step guide to set up the Vehicle Insurance Management System (VIMS) on Windows.**

---

## 📋 Table of Contents

1. [Prerequisites & Required Tools](#1-prerequisites--required-tools)
2. [Installation Steps](#2-installation-steps)
3. [Project Setup](#3-project-setup)
4. [Database Configuration](#4-database-configuration)
5. [Environment Variables](#5-environment-variables)
6. [Running the Application](#6-running-the-application)
7. [Initial Data Setup](#7-initial-data-setup)
8. [Verification & Testing](#8-verification--testing)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites & Required Tools

### 1.1 Required Software

You need to install the following tools on Windows:

| Tool | Purpose | Download Link |
|------|---------|---------------|
| **Node.js** | JavaScript runtime for backend/frontend | https://nodejs.org/ (v18+ recommended) |
| **PostgreSQL** | Database server | https://www.postgresql.org/download/windows/ |
| **Git** | Version control | https://git-scm.com/download/win |
| **VS Code** (Optional) | Code editor | https://code.visualstudio.com/ |
| **pgAdmin4** (Optional) | Database GUI tool | https://www.pgadmin.org/download/pgadmin-4-windows/ |

### 1.2 System Requirements

- **OS**: Windows 10/11
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 2GB free space
- **Internet**: Required for downloading dependencies
- **PowerShell**: Comes pre-installed with Windows 10/11

---

## 2. Installation Steps

### 2.1 Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer (`node-vXX.X.X-x64.msi`)
4. Follow the installation wizard (keep default options)
5. **Verify installation:**
   ```powershell
   node --version    # Should show v18.x.x or higher
   npm --version     # Should show 9.x.x or higher
   ```

**If commands don't work:**
- Restart PowerShell/Command Prompt
- Restart your computer if needed
- Verify Node.js is in PATH: `$env:PATH -split ';' | Select-String "node"`

---

### 2.2 Install PostgreSQL

1. Go to https://www.postgresql.org/download/windows/
2. Download **PostgreSQL Installer** (latest version)
3. Run the installer
4. **Important settings during installation:**
   - **Port**: `5432` (default - keep it)
   - **Superuser password**: **Remember this password!** (e.g., `postgres123`)
   - **Locale**: Default (or your preference)
5. Complete the installation
6. **Verify installation:**
   ```powershell
   psql --version
   ```

**If `psql` command not found:**
- Add PostgreSQL to PATH manually:
  - Usually located at: `C:\Program Files\PostgreSQL\XX\bin`
  - Add to System Environment Variables → Path

---

### 2.3 Install Git

1. Go to https://git-scm.com/download/win
2. Download and run the installer
3. Keep default options during installation
4. **Verify installation:**
   ```powershell
   git --version
   ```

---

### 2.4 Install VS Code (Optional but Recommended)

1. Go to https://code.visualstudio.com/
2. Download for Windows
3. Install and launch VS Code
4. **Recommended Extensions** (install after opening VS Code):
   - ESLint
   - Prettier
   - PostgreSQL (for database management)
   - GitLens

---

### 2.5 Install pgAdmin4 (Optional - For Database GUI)

1. Go to https://www.pgadmin.org/download/pgadmin-4-windows/
2. Download and install
3. Set a master password when prompted

---

## 3. Project Setup

### 3.1 Get the Project Code

**Option A: Clone from Git Repository**
```powershell
# Navigate to where you want the project
cd C:\Users\YourName\Projects

# Clone the repository
git clone <repository-url> vims-project

# Navigate into the project
cd vims-project
```

**Option B: Copy Project Folder**
1. Copy the entire `vims-project` folder to your desired location
2. Open PowerShell in that folder (Right-click → "Open PowerShell window here")

---

### 3.2 Install Project Dependencies

**Install all dependencies at once:**
```powershell
# From the project root directory
npm run install-all
```

This will install dependencies for:
- Root project
- Backend
- Frontend
- Smart contracts
- Other services

**Expected time:** 5-10 minutes depending on internet speed

**Or install manually:**
```powershell
# Root
npm install

# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..

# Smart contracts
cd smart-contracts
npm install
cd ..
```

---

## 4. Database Configuration

### 4.1 Start PostgreSQL Service

**Check if PostgreSQL is running:**
```powershell
Get-Service postgresql*
```

**If not running, start it:**
```powershell
# Find your PostgreSQL service name (replace XX with version)
Get-Service postgresql*

# Start the service (replace XX with your version number)
Start-Service postgresql-x64-XX
```

**Example:**
```powershell
Start-Service postgresql-x64-16
```

---

### 4.2 Create PostgreSQL Database

**Method 1: Using Command Line (Recommended)**

```powershell
# Connect to PostgreSQL (use the password you set during installation)
psql -U postgres

# In PostgreSQL prompt, run:
CREATE DATABASE vims;
\q
```

**Method 2: Using pgAdmin4**
1. Open pgAdmin4
2. Connect to PostgreSQL server (use your password)
3. Right-click **"Databases"** → **"Create"** → **"Database..."**
4. Name: `vims`
5. Click **"Save"**

---

### 4.3 Verify Database Connection

**Test connection:**
```powershell
cd backend
npm run test:db
```

**Or manually:**
```powershell
psql -U postgres -d vims
# If successful, you'll see: vims=#
# Type \q to exit
```

---

## 5. Environment Variables

### 5.1 Create Backend `.env` File

**Navigate to backend folder:**
```powershell
cd backend
```

**Method 1: Use Setup Script (Easiest)**
```powershell
# From project root
.\setup-project.ps1
```

**Method 2: Manual Creation**

**Create `.env` file:**
```powershell
# Copy example file
Copy-Item .env.example .env

# Edit the file
notepad .env
```

**Copy this content into `.env`:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vims
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
JWT_EXPIRE=7d

# Blockchain Configuration (Optional - for demo, can leave defaults)
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=your-private-key-here
SMART_CONTRACT_ADDRESS=your-contract-address-here

# IPFS Configuration (Optional - for demo, can leave defaults)
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080/ipfs
```

**⚠️ IMPORTANT:** Replace `your_postgres_password_here` with the PostgreSQL password you set during installation!

**Example:**
```env
DB_PASSWORD=postgres123
```

---

### 5.2 Create Frontend `.env.local` File (Optional)

**Navigate to frontend folder:**
```powershell
cd frontend
```

**Create `.env.local` file:**
```powershell
# Copy example file
Copy-Item .env.example .env.local

# Edit if needed
notepad .env.local
```

**Content:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Note:** The frontend should work without this if the backend URL is hardcoded correctly.

---

## 6. Running the Application

### 6.1 Start PostgreSQL Service

**Check if running:**
```powershell
Get-Service postgresql*
```

**If not running, start it:**
```powershell
Start-Service postgresql-x64-XX  # Replace XX with your version number
```

---

### 6.2 Initialize Database Tables

**The database tables will be created automatically when you start the backend server.** Sequelize will sync the models.

**Or manually sync (optional):**
```powershell
cd backend
npm run migrate
```

---

### 6.3 Start Backend Server

**Open PowerShell 1:**
```powershell
cd backend
npm run dev
```

**Expected output:**
```
✅ PostgreSQL connection established successfully
🚀 Server running on http://localhost:5000
```

**Keep this terminal open!**

---

### 6.4 Start Frontend Server

**Open PowerShell 2:**
```powershell
cd frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
```

**Keep this terminal open!**

---

### 6.5 Using the Start Scripts (Alternative)

**Option 1: Start All Services (Separate Windows)**
```powershell
.\start-all.ps1
```

This will start all services in separate PowerShell windows.

**Option 2: Start All Services (Single Terminal)**
```powershell
npm run dev
```

This uses `dev.js` to start all services in one terminal.

---

## 7. Initial Data Setup

### 7.1 Seed Policy Types

**In a new PowerShell (while backend is running):**
```powershell
cd backend
npm run seed-policy-types
```

**Expected output:**
```
✅ Policy types seeded successfully!
```

---

### 7.2 Create Admin User

```powershell
cd backend
npm run create-admin
```

**Follow the prompts:**
- Email: `admin@vims.com`
- Password: `admin123` (or your choice)
- Name: `Admin User`

---

### 7.3 Create Test User

```powershell
cd backend
npm run create-test-user
```

**This creates:**
- Email: `test@test.com`
- Password: `test123`

---

## 8. Verification & Testing

### 8.1 Check Backend is Running

**Open browser:**
```
http://localhost:5000/api/health
```

**Expected:** JSON response like `{"status": "ok"}`

---

### 8.2 Check Frontend is Running

**Open browser:**
```
http://localhost:3000
```

**Expected:** VIMS homepage/login page

---

### 8.3 Test Login

1. Go to http://localhost:3000/login
2. **Test User:**
   - Email: `test@test.com`
   - Password: `test123`
3. **Admin User:**
   - Email: `admin@vims.com`
   - Password: `admin123` (or what you set)

---

### 8.4 View Database Data

**Using the script:**
```powershell
cd backend
npm run view-db
```

**Using pgAdmin4:**
1. Open pgAdmin4
2. Connect to PostgreSQL
3. Navigate: **Servers → PostgreSQL → Databases → vims → Schemas → public → Tables**
4. Right-click `users` → **"View/Edit Data" → "All Rows"**

---

## 9. Troubleshooting

### 9.1 "Cannot connect to PostgreSQL"

**Problem:** Backend can't connect to database

**Solutions:**
1. **Check PostgreSQL is running:**
   ```powershell
   Get-Service postgresql*
   
   # If not running:
   Start-Service postgresql-x64-XX
   ```

2. **Check `.env` file:**
   - Verify `DB_PASSWORD` is correct
   - Verify `DB_HOST=localhost`
   - Verify `DB_PORT=5432`

3. **Test connection manually:**
   ```powershell
   psql -U postgres -d vims
   # Enter password when prompted
   ```

4. **Check if database exists:**
   ```powershell
   psql -U postgres
   # In PostgreSQL prompt:
   \l    # List databases
   # If 'vims' doesn't exist, create it:
   CREATE DATABASE vims;
   \q
   ```

---

### 9.2 "Port 5000 already in use"

**Problem:** Another application is using port 5000

**Solutions:**
1. **Find what's using the port:**
   ```powershell
   netstat -ano | findstr :5000
   
   # Kill the process (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```

2. **Or change port in `backend/.env`:**
   ```env
   PORT=5001
   ```
   Then update frontend API URL accordingly.

---

### 9.3 "Port 3000 already in use"

**Problem:** Another application is using port 3000

**Solutions:**
1. **Kill the process:**
   ```powershell
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Or Next.js will automatically use 3001, 3002, etc.**

---

### 9.4 "Module not found" or "Cannot find module"

**Problem:** Dependencies not installed

**Solution:**
```powershell
# Delete node_modules and reinstall
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

cd ..\frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

### 9.5 "npm: command not found"

**Problem:** Node.js not installed or not in PATH

**Solutions:**
1. **Reinstall Node.js** (see section 2.1)
2. **Restart PowerShell** after installation
3. **Verify installation:**
   ```powershell
   node --version
   npm --version
   ```

---

### 9.6 Frontend shows "Network Error" or "Cannot connect to backend"

**Problem:** Backend not running or CORS issue

**Solutions:**
1. **Verify backend is running:**
   - Check PowerShell for errors
   - Visit http://localhost:5000/api/health

2. **Check `backend/.env`:**
   ```env
   FRONTEND_URL=http://localhost:3000
   ```

3. **Check backend CORS settings** in `backend/server.js`

---

### 9.7 Database tables not created

**Problem:** Sequelize didn't sync models

**Solutions:**
1. **Check backend logs** for errors
2. **Verify database connection** (see 9.1)
3. **Manually sync:**
   ```powershell
   cd backend
   node -e "require('./models/sequelize').sequelize.sync({ force: false })"
   ```

---

## 📝 Quick Reference Commands

### Start Everything
```powershell
# Option 1: Single command (all in one terminal)
npm run dev

# Option 2: Separate windows
.\start-all.ps1

# Option 3: Manual (separate terminals)
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Database Commands
```powershell
# View database data
cd backend
npm run view-db

# Create admin user
npm run create-admin

# Create test user
npm run create-test-user

# Seed policy types
npm run seed-policy-types
```

### Check Services
```powershell
# Check PostgreSQL
Get-Service postgresql*

# Check if ports are in use
netstat -ano | findstr :5000
netstat -ano | findstr :3000
```

---

## ✅ Setup Checklist

Use this checklist to ensure everything is set up:

- [ ] Node.js installed (`node --version`)
- [ ] PostgreSQL installed (`psql --version`)
- [ ] Git installed (`git --version`)
- [ ] Project folder copied/cloned
- [ ] Dependencies installed (`npm run install-all`)
- [ ] Database `vims` created
- [ ] Backend `.env` file created with correct password
- [ ] PostgreSQL service running
- [ ] Backend server running (http://localhost:5000)
- [ ] Frontend server running (http://localhost:3000)
- [ ] Policy types seeded
- [ ] Admin user created
- [ ] Test user created
- [ ] Can login to frontend
- [ ] Can view database data

---

## 🎯 Next Steps After Setup

1. **Explore the Application:**
   - Login as test user
   - Try buying a policy
   - Submit a claim
   - Login as admin to review claims

2. **Read Documentation:**
   - `README.md` - Project overview
   - `GITHUB_PUSH_GUIDE.md` - How to push to GitHub

3. **Customize:**
   - Update `.env` files with your preferences
   - Modify frontend styling
   - Add new features

---

## 📞 Getting Help

If you encounter issues:

1. **Check the error message** in PowerShell
2. **Review the Troubleshooting section** above
3. **Check logs:**
   - Backend: PowerShell running `npm run dev`
   - Frontend: PowerShell running `npm run dev`
   - Browser: Open Developer Tools (F12) → Console tab

4. **Verify all prerequisites** are installed correctly

---

## 🎉 Success!

If you can:
- ✅ Access http://localhost:3000
- ✅ Login with test/admin credentials
- ✅ See the dashboard
- ✅ View database data

**Congratulations! Your VIMS project is set up and ready to use!** 🚀

---

**Last Updated:** December 2024  
**Project Version:** 1.1.0  
**Platform:** Windows 10/11
