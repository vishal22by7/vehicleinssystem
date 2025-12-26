# VIMS - Start All Services Script
# This script starts all required services for the Vehicle Insurance Management System

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VIMS - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running (optional check)
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Function to start a service in a new window
function Start-ServiceInWindow {
    param(
        [string]$ServiceName,
        [string]$Command,
        [string]$Color = "White"
    )
    
    Write-Host "Starting $ServiceName..." -ForegroundColor $Color
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '$ServiceName' -ForegroundColor $Color; $Command"
    Start-Sleep -Seconds 2
}

# Start services in separate windows
Write-Host "`nStarting services in separate windows...`n" -ForegroundColor Green

# 1. Blockchain (Hardhat)
Start-ServiceInWindow -ServiceName "BLOCKCHAIN (Hardhat)" -Command "cd smart-contracts; npx hardhat node" -Color "Cyan"

# 2. Backend
Start-ServiceInWindow -ServiceName "BACKEND API" -Command "cd backend; npm run dev" -Color "Yellow"

# 3. Frontend (Next.js - use 'dev' for development, not 'start')
Start-ServiceInWindow -ServiceName "FRONTEND (Next.js)" -Command "cd frontend; npm run dev" -Color "Green"

# 4. ML Analyzer (Python)
Write-Host "Starting ML Service..." -ForegroundColor Magenta
$mlServicePath = Join-Path $PSScriptRoot "service"
$venvActivate = Join-Path $mlServicePath "venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'ML SERVICE' -ForegroundColor Magenta; cd '$mlServicePath'; .\venv\Scripts\Activate.ps1; python app.py"
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'ML SERVICE' -ForegroundColor Magenta; cd '$mlServicePath'; python app.py"
}
Start-Sleep -Seconds 2

# 5. Fabric Simulator
Start-ServiceInWindow -ServiceName "FABRIC SIMULATOR" -Command "cd fabric-simulator; npm start" -Color "Blue"

# 6. Oracle Service
Start-ServiceInWindow -ServiceName "ORACLE SERVICE" -Command "cd oracle-service; npm start" -Color "Red"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  All services are starting..." -ForegroundColor Green
Write-Host "  Check the opened windows for status" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nPress any key to exit this script (services will continue running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

