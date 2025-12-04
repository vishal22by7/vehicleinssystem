# VIMS Project Setup Script
# This script helps set up the VIMS project environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VIMS Project Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL (optional check)
Write-Host ""
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version 2>$null
    if ($pgVersion) {
        Write-Host "✅ PostgreSQL found" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  PostgreSQL not found in PATH (may still be installed)" -ForegroundColor Yellow
    Write-Host "   Make sure PostgreSQL is installed and running" -ForegroundColor Yellow
}

Write-Host ""

# Create backend .env file if it doesn't exist
$envFile = Join-Path $backendPath ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Creating backend/.env file..." -ForegroundColor Yellow
    
    # Prompt for PostgreSQL password
    Write-Host ""
    Write-Host "Please enter your PostgreSQL password:" -ForegroundColor Cyan
    Write-Host "(This is the password you set during PostgreSQL installation)" -ForegroundColor Gray
    $dbPassword = Read-Host -AsSecureString
    $dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
    )
    
    # Generate a random JWT secret
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    
    $envContent = @"
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vims
DB_USER=postgres
DB_PASSWORD=$dbPasswordPlain

# JWT Authentication
JWT_SECRET=$jwtSecret
JWT_EXPIRE=7d

# Blockchain Configuration (Optional - for demo)
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=your-private-key-here
SMART_CONTRACT_ADDRESS=your-contract-address-here

# IPFS Configuration (Optional - for demo)
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080/ipfs
"@
    
    $envContent | Out-File $envFile -Encoding UTF8
    Write-Host "✅ Created backend/.env file" -ForegroundColor Green
} else {
    Write-Host "⚠️  backend/.env already exists, skipping..." -ForegroundColor Yellow
}

# Create frontend .env.local file if it doesn't exist
$frontendEnvFile = Join-Path $frontendPath ".env.local"
if (-not (Test-Path $frontendEnvFile)) {
    Write-Host "Creating frontend/.env.local file..." -ForegroundColor Yellow
    "NEXT_PUBLIC_API_URL=http://localhost:5000" | Out-File $frontendEnvFile -Encoding UTF8
    Write-Host "✅ Created frontend/.env.local file" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor White
Write-Host "2. Create the database: psql -U postgres -c 'CREATE DATABASE vims;'" -ForegroundColor White
Write-Host "3. Install dependencies: npm run install-all" -ForegroundColor White
Write-Host "4. Start backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "5. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "6. Seed data: cd backend && npm run seed-policy-types" -ForegroundColor White
Write-Host "7. Create admin: cd backend && npm run create-admin" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: COMPLETE_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

