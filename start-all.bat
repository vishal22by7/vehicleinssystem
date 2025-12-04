@echo off
REM VIMS - Start All Services Script (Batch version)
REM This script starts all required services for the Vehicle Insurance Management System

echo ========================================
echo   VIMS - Starting All Services
echo ========================================
echo.

echo Starting services in separate windows...
echo.

REM Start Blockchain (Hardhat)
start "BLOCKCHAIN (Hardhat)" cmd /k "cd smart-contracts && npx hardhat node"

REM Start Backend
start "BACKEND API" cmd /k "cd backend && npm run dev"

REM Start Frontend
start "FRONTEND (React)" cmd /k "cd frontend && npm start"

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
pause

