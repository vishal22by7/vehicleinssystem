"""
FastAPI microservice that exposes the vehicle damage ML model.

Endpoint:
  POST /analyze/upload  - form-data file field "file"
Returns JSON:
  {
    "severity": int,
    "damage_parts": [...],
    "confidence": float,
    "timestamp": "...",
    "is_vehicle": bool,
    "description": str
  }
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

from damage_model import analyze_damage

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ml-model-service")

app = FastAPI(
    title="VIMS Local ML Model",
    description="Local vehicle damage classifier (no Kaggle, no Gemini).",
    version="1.0.0",
)

# CORS (allow frontend/backend to call this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "VIMS Local ML Model",
        "status": "running"
    }


@app.post("/analyze/upload")
async def analyze_upload(file: UploadFile = File(...)):
    """
    Analyze vehicle damage from an uploaded image file.
    """
    try:
        logger.info(f"📥 Received file: {file.filename}, content_type={file.content_type}")
        image_bytes = await file.read()

        result = analyze_damage(image_bytes)

        response = {
            "severity": result["severity"],
            "damage_parts": result["damage_parts"],
            "confidence": result["confidence"],
            "timestamp": datetime.utcnow().isoformat(),
            "is_vehicle": result["is_vehicle"],
            "description": result["description"],
        }

        logger.info(
            f"✅ Analysis complete - severity={response['severity']}, "
            f"parts={response['damage_parts']}, conf={response['confidence']:.2f}"
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("❌ Error in /analyze/upload")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
