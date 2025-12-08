from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional
import requests
import io
from PIL import Image
from google import genai
import json
import os
from datetime import datetime
import base64
import aiohttp
from dotenv import load_dotenv
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# IPFS Gateway URL
IPFS_GATEWAY = os.getenv("IPFS_GATEWAY_URL", "http://localhost:8080/ipfs")
IPFS_API_URL = os.getenv("IPFS_API_URL", "https://api.pinata.cloud/pinning")
PINATA_GATEWAY = os.getenv("PINATA_GATEWAY", "https://gateway.pinata.cloud/ipfs")
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")
PINATA_JWT = os.getenv("PINATA_JWT")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Initialize Gemini
gemini_client = None
gemini_model_name = "gemini-2.5-flash"  # Using latest model from Google docs

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    init_gemini()
    yield

app = FastAPI(title="VIMS ML Damage Analyzer", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MLReport(BaseModel):
    severity: float
    damage_parts: list
    confidence: float
    timestamp: str
    mlReportCID: Optional[str] = None
    is_vehicle: bool = True
    validation_error: Optional[str] = None

class AnalyzeRequest(BaseModel):
    ipfsCid: str

def init_gemini():
    """Initialize Gemini API using new Google API format"""
    global gemini_client
    try:
        if not GEMINI_API_KEY:
            print("⚠️  Warning: GEMINI_API_KEY not set, using mock analysis")
            gemini_client = None
            return
        
        # The client gets the API key from the environment variable GEMINI_API_KEY
        # Make sure GEMINI_API_KEY is set in environment
        os.environ['GEMINI_API_KEY'] = GEMINI_API_KEY
        gemini_client = genai.Client()
    except Exception as e:
        print(f"⚠️  Warning: Could not initialize Gemini: {e}")
        print("   Using mock analysis for development")
        gemini_client = None

def download_from_ipfs(cid: str) -> bytes:
    """Download file from IPFS using gateway"""
    try:
        url = f"{IPFS_GATEWAY}/{cid}"
        logger.info(f"🌐 Attempting to download from: {url}")
        response = requests.get(url, timeout=30)
        logger.info(f"📡 Response status: {response.status_code}")
        if response.status_code == 200:
            logger.info(f"✅ Download successful, content length: {len(response.content)} bytes")
            return response.content
        else:
            logger.error(f"❌ IPFS gateway returned status {response.status_code}")
            logger.error(f"Response text: {response.text[:200]}")
            raise Exception(f"IPFS gateway returned status {response.status_code}")
    except Exception as e:
        logger.error(f"❌ Failed to download from IPFS: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise Exception(f"Failed to download from IPFS: {str(e)}")

def analyze_damage_with_gemini(image_bytes) -> dict:
    """
    Analyze vehicle damage using Gemini Vision API
    Returns severity (0-100), damage parts, and confidence
    @param image_bytes: bytes or BytesIO object containing image data
    """
    # Ensure image_bytes is actually bytes, not a BytesIO object
    if hasattr(image_bytes, 'read'):
        # If it's a file-like object (BytesIO), read from it
        image_bytes.seek(0)  # Reset to beginning
        image_bytes = image_bytes.read()
    elif not isinstance(image_bytes, bytes):
        # Try to convert to bytes
        try:
            image_bytes = bytes(image_bytes)
        except Exception as e:
            logger.error(f"❌ Cannot convert image_bytes to bytes: {str(e)}")
            raise ValueError(f"Cannot identify image file: {str(e)}")
    
    # Validate we have actual bytes
    if not isinstance(image_bytes, bytes) or len(image_bytes) == 0:
        raise ValueError("Invalid image data: empty or not bytes")
    
    if not gemini_client:
        # Mock analysis for development when Gemini is not available
        import random
        return {
            "severity": random.uniform(30, 90),
            "damage_parts": ["front_bumper", "headlight", "hood"],
            "confidence": random.uniform(0.6, 0.95),
            "is_vehicle": True,
            "validation_error": None
        }
    
    try:
        # Comprehensive system prompt for vehicle damage analysis
        prompt = """You are an expert automotive damage assessment AI. Your task is to analyze vehicle images and provide accurate damage assessments for insurance claims.

## TASK
Analyze the provided vehicle image and assess any visible damage. Return your analysis in valid JSON format only.

## VEHICLE VALIDATION
First, determine if the image contains a vehicle (car, truck, SUV, motorcycle, bus, van, etc.). If no vehicle is present, return is_vehicle: false.

## DAMAGE ASSESSMENT CRITERIA

### Severity Scale (0-100):
- **0-15**: No visible damage or minor cosmetic scratches (paint scratches, small scuffs)
- **16-30**: Light damage (small dents, minor scratches, paint chips)
- **31-45**: Moderate damage (visible dents, cracked lights, minor panel damage)
- **46-60**: Significant damage (broken headlights/taillights, cracked windshield, major dents, damaged bumpers)
- **61-75**: Severe damage (structural damage visible, multiple broken parts, airbag deployment indicators, frame damage)
- **76-90**: Critical damage (extensive structural damage, multiple panels affected, safety systems compromised)
- **91-100**: Total loss (vehicle appears totaled, extensive damage throughout, likely unrepairable)

### Common Vehicle Parts to Check:
- **Front**: front_bumper, front_grille, headlight, fog_light, hood, windshield, front_fender, front_door
- **Side**: side_mirror, side_panel, door, window, wheel, tire, rim, side_skirt
- **Rear**: rear_bumper, taillight, trunk, rear_window, rear_fender, exhaust
- **Roof**: roof, sunroof, antenna
- **Structural**: frame, chassis, suspension, axle

### Damage Types to Identify:
- Scratches, scuffs, paint damage
- Dents, dings, creases
- Cracks (glass, lights, panels)
- Broken/missing parts
- Structural damage (bent frame, misalignment)
- Water damage indicators
- Fire damage indicators

## CONFIDENCE SCORING (0.0-1.0):
- 0.9-1.0: High quality image, clear view of damage, good lighting
- 0.7-0.89: Good image quality, damage visible but some angles unclear
- 0.5-0.69: Moderate quality, damage partially visible, limited angles
- 0.3-0.49: Poor quality, damage hard to assess, blurry or dark
- 0.0-0.29: Very poor quality, cannot reliably assess damage

## OUTPUT FORMAT
Respond ONLY with valid JSON. No markdown, no explanations, just JSON:

{
  "is_vehicle": true/false,
  "severity": 0-100,
  "damage_parts": ["part1", "part2", ...],
  "confidence": 0.0-1.0,
  "description": "Brief technical description of damage observed"
}

## EXAMPLES

No damage:
{"is_vehicle": true, "severity": 5, "damage_parts": [], "confidence": 0.95, "description": "No visible damage"}

Minor damage:
{"is_vehicle": true, "severity": 25, "damage_parts": ["front_bumper", "headlight"], "confidence": 0.9, "description": "Minor scratches on front bumper, small crack in headlight"}

Severe damage:
{"is_vehicle": true, "severity": 75, "damage_parts": ["front_bumper", "headlight", "hood", "windshield", "front_fender"], "confidence": 0.85, "description": "Severe front-end collision damage with multiple broken parts and structural concerns"}

Not a vehicle:
{"is_vehicle": false, "severity": 0, "damage_parts": [], "confidence": 0.0, "description": "Image does not contain a vehicle"}

## IMPORTANT
- Be precise and conservative in severity assessment
- Only list parts where damage is clearly visible
- Base confidence on image quality, not damage severity
- If uncertain about damage extent, use lower severity scores
- Return valid JSON only - no additional text"""

        # Convert image to PIL Image
        try:
            # Create BytesIO from raw bytes
            image_buffer = io.BytesIO(image_bytes)
            image = Image.open(image_buffer).convert('RGB')
            logger.info(f"🖼️  Image loaded: {image.size[0]}x{image.size[1]} pixels, format: {image.format}")
        except Exception as img_error:
            logger.error(f"❌ PIL Image.open failed: {str(img_error)}")
            logger.error(f"   image_bytes type: {type(image_bytes)}, length: {len(image_bytes)}")
            raise ValueError(f"Cannot identify image file: {str(img_error)}")
        
        # Generate response from Gemini using new API format
        logger.info(f"🤖 Sending request to Gemini model: {gemini_model_name}")
        response = gemini_client.models.generate_content(
            model=gemini_model_name,
            contents=[prompt, image]
        )
        logger.info("✅ Received response from Gemini")
        
        # Parse response text
        response_text = response.text.strip()
        logger.debug(f"📝 Gemini response length: {len(response_text)} characters")
        
        # Extract JSON from response (handle markdown code blocks if present)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract values from text
            logger.warning(f"⚠️  Could not parse JSON, response: {response_text[:200]}")
            # Fallback: extract severity from text if possible
            import re
            severity_match = re.search(r'"severity"\s*:\s*(\d+)', response_text)
            severity = int(severity_match.group(1)) if severity_match else 50
            
            is_vehicle = "is_vehicle" not in response_text.lower() or "true" in response_text.lower()
            
            result = {
                "is_vehicle": is_vehicle,
                "severity": severity,
                "damage_parts": ["unknown"] if severity > 0 else [],
                "confidence": 0.7,
                "description": response_text[:100]
            }
        
        # Validate and format response
        is_vehicle = result.get("is_vehicle", True)
        severity = float(result.get("severity", 0))
        damage_parts = result.get("damage_parts", [])
        confidence = float(result.get("confidence", 0.7))
        
        # Normalize severity to 0-100 range
        severity = max(0, min(100, severity))
        
        # Normalize confidence to 0-1 range
        confidence = max(0.0, min(1.0, confidence))
        
        if not is_vehicle:
            return {
                "severity": 0.0,
                "damage_parts": [],
                "confidence": 0.0,
                "is_vehicle": False,
                "validation_error": result.get("description", "Image does not appear to contain a vehicle")
            }
        
        return {
            "severity": round(severity, 2),
            "damage_parts": damage_parts if isinstance(damage_parts, list) else [],
            "confidence": round(confidence, 3),
            "is_vehicle": True,
            "validation_error": None
        }
        
    except Exception as e:
        logger.error(f"❌ Gemini analysis error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Return mock data on error
        return {
            "severity": 50.0,
            "damage_parts": ["unknown"],
            "confidence": 0.5,
            "is_vehicle": True,
            "validation_error": f"Analysis error: {str(e)}"
        }

async def upload_to_ipfs(data: dict) -> str:
    """Upload JSON report to IPFS via Pinata"""
    if not (PINATA_JWT or (PINATA_API_KEY and PINATA_SECRET_API_KEY)):
        logger.warning("⚠️  IPFS upload skipped: Pinata credentials not configured")
        logger.warning(f"   PINATA_JWT: {'Set' if PINATA_JWT else 'Not set'}")
        logger.warning(f"   PINATA_API_KEY: {'Set' if PINATA_API_KEY else 'Not set'}")
        logger.warning(f"   PINATA_SECRET_API_KEY: {'Set' if PINATA_SECRET_API_KEY else 'Not set'}")
        return None

    try:
        json_str = json.dumps(data, indent=2)
        json_bytes = json_str.encode('utf-8')
        logger.info(f"📦 Preparing to upload ML report ({len(json_bytes)} bytes)")

        url = f"{IPFS_API_URL.rstrip('/')}/pinFileToIPFS"
        logger.info(f"🌐 Uploading to Pinata: {url}")

        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            # Use BytesIO to create a file-like object (Pinata expects a file, not raw bytes)
            json_file = io.BytesIO(json_bytes)
            json_file.seek(0)  # Ensure we're at the start of the file
            # Pinata API expects 'file' field with the file content
            form_data.add_field('file', 
                              json_file, 
                              filename='ml_report.json', 
                              content_type='application/json')
            form_data.add_field('pinataMetadata', 
                              json.dumps({"name": "ml_report.json"}), 
                              content_type='application/json')
            form_data.add_field('pinataOptions', 
                              json.dumps({"cidVersion": 1}), 
                              content_type='application/json')

            headers = {}
            if PINATA_JWT:
                headers['Authorization'] = f"Bearer {PINATA_JWT}"
                logger.info("🔑 Using Pinata JWT authentication")
            else:
                headers['pinata_api_key'] = PINATA_API_KEY
                headers['pinata_secret_api_key'] = PINATA_SECRET_API_KEY
                logger.info("🔑 Using Pinata API key authentication")
                logger.debug(f"   API Key: {PINATA_API_KEY[:10]}...")

            async with session.post(url, data=form_data, headers=headers) as response:
                response_text = await response.text()
                logger.info(f"📡 Pinata response status: {response.status}")
                logger.debug(f"📡 Pinata response: {response_text[:200]}")
                
                if response.status == 200:
                    try:
                        result = await response.json()
                        cid = result.get('IpfsHash') or result.get('Hash')
                        if cid:
                            logger.info(f"✅ Upload successful, CID: {cid}")
                            logger.info(f"🔗 Report available at: {PINATA_GATEWAY}/{cid}")
                            return cid
                        else:
                            logger.warning("⚠️  Upload response missing CID")
                            logger.warning(f"   Response: {result}")
                            return None
                    except Exception as json_error:
                        logger.error(f"❌ Failed to parse Pinata response as JSON: {json_error}")
                        logger.error(f"   Response text: {response_text[:500]}")
                        return None
                else:
                    logger.error(f"❌ Pinata upload failed: Status {response.status}")
                    logger.error(f"   Response: {response_text[:500]}")
                    # Don't raise exception, just return None so the process can continue
                    return None
    except aiohttp.ClientError as e:
        logger.error(f"❌ IPFS upload network error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None
    except Exception as e:
        logger.error(f"❌ IPFS upload failed: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

@app.get("/")
async def root():
    return {
        "service": "VIMS ML Damage Analyzer",
        "status": "running",
        "model_loaded": gemini_client is not None,
        "model_type": "Gemini Vision API",
        "model_name": gemini_model_name
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": gemini_client is not None,
        "model_type": "Gemini Vision API",
        "model_name": gemini_model_name
    }

@app.post("/analyze", response_model=MLReport)
async def analyze_from_ipfs(request: AnalyzeRequest):
    """
    Analyze damage from IPFS CID
    Downloads image from IPFS, analyzes it using Gemini, and uploads report back to IPFS
    """
    try:
        logger.info(f"📥 Received analysis request for IPFS CID: {request.ipfsCid}")
        
        # Download image from IPFS
        logger.info(f"⬇️  Downloading image from IPFS gateway: {IPFS_GATEWAY}/{request.ipfsCid}")
        image_bytes = download_from_ipfs(request.ipfsCid)
        logger.info(f"✅ Image downloaded successfully, size: {len(image_bytes)} bytes")
        
        # Analyze damage using Gemini
        logger.info("🔍 Starting Gemini damage analysis...")
        analysis = analyze_damage_with_gemini(image_bytes)
        logger.info(f"✅ Analysis complete: severity={analysis.get('severity')}, confidence={analysis.get('confidence')}")
        
        # Check if validation failed
        if not analysis.get("is_vehicle", True) or analysis.get("validation_error"):
            # Return error response with validation details
            error_msg = analysis.get("validation_error", "Image validation failed")
            logger.warning(f"⚠️  Validation failed: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid image: Not a vehicle",
                    "message": error_msg,
                    "severity": 0.0,
                    "is_vehicle": False
                }
            )
        
        # Create ML report
        report = {
            "severity": analysis["severity"],
            "damage_parts": analysis["damage_parts"],
            "confidence": analysis["confidence"],
            "timestamp": datetime.utcnow().isoformat(),
            "evidenceCID": request.ipfsCid,
            "is_vehicle": analysis.get("is_vehicle", True),
            "validation_error": analysis.get("validation_error")
        }
        
        # Upload report to IPFS
        logger.info("📤 Uploading ML report to IPFS...")
        mlReportCID = await upload_to_ipfs(report)
        if mlReportCID:
            report["mlReportCID"] = mlReportCID
            logger.info(f"✅ ML report uploaded to IPFS: {mlReportCID}")
        else:
            logger.warning("⚠️  ML report IPFS upload failed, continuing without CID")
        
        logger.info("✅ Analysis request completed successfully")
        return MLReport(**report)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in analyze_from_ipfs: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/upload")
async def analyze_upload(file: UploadFile = File(...)):
    """
    Analyze damage from direct file upload using Gemini
    """
    try:
        logger.info(f"📥 Received direct file upload: {file.filename}, content_type: {file.content_type}")
        
        # Read file content and ensure it's bytes, not BytesIO
        file_content = await file.read()
        
        # If it's already bytes, use it directly; otherwise convert
        if isinstance(file_content, bytes):
            image_bytes = file_content
        elif hasattr(file_content, 'read'):
            # If it's a file-like object, read from it
            image_bytes = file_content.read()
        else:
            # Try to convert to bytes
            image_bytes = bytes(file_content)
        
        logger.info(f"✅ File read successfully, size: {len(image_bytes)} bytes, type: {type(image_bytes)}")
        
        # Validate that we have actual image bytes
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file received")
        
        # Try to validate it's an image by attempting to open it
        try:
            test_image = Image.open(io.BytesIO(image_bytes))
            test_image.verify()  # Verify it's a valid image
            logger.info(f"✅ Image validation passed: {test_image.format}, {test_image.size}")
        except Exception as img_error:
            logger.error(f"❌ Image validation failed: {str(img_error)}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid image file",
                    "message": f"Cannot identify image file: {str(img_error)}"
                }
            )
        
        logger.info("🔍 Starting Gemini damage analysis...")
        analysis = analyze_damage_with_gemini(image_bytes)
        logger.info(f"✅ Analysis complete: severity={analysis.get('severity')}, confidence={analysis.get('confidence')}")
        
        # Check if validation failed
        if not analysis.get("is_vehicle", True) or analysis.get("validation_error"):
            error_msg = analysis.get("validation_error", "Image validation failed")
            logger.warning(f"⚠️  Validation failed: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid image: Not a vehicle",
                    "message": error_msg,
                    "severity": 0.0,
                    "is_vehicle": False
                }
            )
        
        report = {
            "severity": analysis["severity"],
            "damage_parts": analysis["damage_parts"],
            "confidence": analysis["confidence"],
            "timestamp": datetime.utcnow().isoformat(),
            "is_vehicle": analysis.get("is_vehicle", True),
            "validation_error": analysis.get("validation_error")
        }
        
        # Upload report to IPFS
        logger.info("📤 Uploading ML report to IPFS...")
        mlReportCID = await upload_to_ipfs(report)
        if mlReportCID:
            report["mlReportCID"] = mlReportCID
            logger.info(f"✅ ML report uploaded to IPFS: {mlReportCID}")
        else:
            logger.warning("⚠️  ML report IPFS upload failed, continuing without CID")
        
        logger.info("✅ Direct upload analysis completed successfully")
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in analyze_upload: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)