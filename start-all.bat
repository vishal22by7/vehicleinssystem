@echo off
REM VIMS - Start All Services Script (Batch version)
REM This script starts all required services for the Vehicle Insurance Management System
REM IMPORTANT: Blockchain node must be running for full functionality!

echo ========================================
echo   VIMS - Starting All Services
echo ========================================
echo.
echo IMPORTANT: Blockchain is required for this project!
echo The blockchain node will start first, then other services.
echo.

echo Starting blockchain node...
start "BLOCKCHAIN (Hardhat)" cmd /k "cd smart-contracts && npx hardhat node"

echo.
echo Waiting 5 seconds for blockchain node to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Checking blockchain readiness...
node utils\wait-for-blockchain.js
if errorlevel 1 (
    echo.
    echo WARNING: Blockchain node is not ready yet!
    echo Other services will start, but blockchain features may not work.
    echo.
    echo To fix: Make sure Hardhat node is running on port 8545
    echo Check the BLOCKCHAIN window for errors.
    echo.
    timeout /t 3 /nobreak >nul
) else (
    echo.
    echo Blockchain is ready! Starting other services...
    echo.
)

REM Start Backend
start "BACKEND API" cmd /k "cd backend && npm run dev"

REM Start Frontend
start "FRONTEND (React)" cmd /k "cd frontend && npm run dev"

REM Start ML Analyzer (Python)
if exist "ml-analyzer\venv\Scripts\activate.bat" (
    start "ML ANALYZER" cmd /k "cd ml-analyzer && venv\Scripts\activate.bat && python app.py"
) else (
    start "ML ANALYZER" cmd /k "cd ml-analyzer && python app.py"
)

REM Start Fabric Simulator
start "FABRIC SIMULATOR" cmd /k "cd fabric-simulator && npm start"

REM Start Oracle Service
start "ORACLE SERVICE" cmd /k "cd oracle-service && npm start"

echo.
echo ========================================
echo   All services are starting...
echo   Check the opened windows for status
echo ========================================
echo.
echo NOTE: If blockchain features don't work:
echo   1. Check BLOCKCHAIN window is running
echo   2. Run: node utils\check-blockchain-setup.js
echo   3. See: smart-contracts\DEPLOY_INSTRUCTIONS.md
echo.
pause

