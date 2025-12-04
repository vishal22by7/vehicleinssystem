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

### Step 5: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Wait for: `🚀 Server running on http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Wait for: `Local: http://localhost:3000`

### Step 6: Initialize Data

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

1. **Backend:** http://localhost:5000/api/health
   - Should return: `{"status": "ok"}`

2. **Frontend:** http://localhost:3000
   - Should show login page

3. **Login Test:**
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

