# ML Damage Analyzer Microservice

FastAPI service for analyzing vehicle damage using ResNet.

## Setup

### Windows (PowerShell)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run service
python app.py

# Or with uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Linux/Mac

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
python app.py

# Or with uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Environment Variables

- `IPFS_GATEWAY_URL`: IPFS gateway URL (default: http://localhost:8080/ipfs)
- `IPFS_API_URL`: IPFS API URL (default: http://localhost:5001/api/v0)

## Endpoints

- `GET /`: Service info
- `GET /health`: Health check
- `POST /analyze`: Analyze from IPFS CID
- `POST /analyze/upload`: Analyze from file upload

