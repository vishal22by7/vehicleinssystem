# Vehicle Damage Test Images Guide

This guide provides sources and instructions for downloading test images to verify ML analysis and severity reporting.

## Quick Test Image Sources

### 1. **Unsplash** (Free, High Quality)
- **URL**: https://unsplash.com/s/photos/car-accident
- **URL**: https://unsplash.com/s/photos/damaged-car
- **URL**: https://unsplash.com/s/photos/car-damage
- **License**: Free to use (Unsplash License)
- **Quality**: High resolution, professional photos
- **Search Terms**: "car accident", "damaged car", "car crash", "vehicle damage"

### 2. **Pexels** (Free, High Quality)
- **URL**: https://www.pexels.com/search/car%20accident/
- **URL**: https://www.pexels.com/search/damaged%20car/
- **License**: Free to use (Pexels License)
- **Quality**: High resolution, diverse collection

### 3. **Pixabay** (Free, High Quality)
- **URL**: https://pixabay.com/images/search/car%20accident/
- **URL**: https://pixabay.com/images/search/damaged%20car/
- **License**: Free for commercial use
- **Quality**: Good variety of images

### 4. **Kaggle Datasets** (For Testing)
- **Vehicle Damage Dataset**: Search "vehicle damage detection" on Kaggle
- **Car Crash Dataset**: Search "car crash dataset" on Kaggle
- **License**: Varies by dataset (check individual licenses)

### 5. **Google Images** (Use with Caution)
- **Search**: "car accident damage", "vehicle collision", "car crash damage"
- **Filter**: Tools → Usage Rights → Labeled for reuse
- **Note**: Always verify license before using

## Recommended Test Image Categories

### Low Severity (0-30)
- Minor scratches on paint
- Small dents
- Scuffed bumpers
- Paint chips
- **Search Terms**: "minor car damage", "car scratch", "small dent"

### Moderate Severity (31-60)
- Visible dents
- Cracked headlights/taillights
- Damaged bumpers
- Broken mirrors
- **Search Terms**: "moderate car damage", "cracked headlight", "damaged bumper"

### High Severity (61-90)
- Major collision damage
- Multiple broken parts
- Structural damage visible
- Airbag deployment
- **Search Terms**: "major car accident", "severe car damage", "totaled car"

### Critical Severity (91-100)
- Extensive damage
- Multiple panels affected
- Frame damage visible
- **Search Terms**: "totaled vehicle", "extreme car damage", "car wreck"

## Quick Download Script

See `download_test_images.py` for an automated download script.

## Manual Download Tips

1. **Right-click** on the image
2. Select **"Save image as..."** or **"Save picture as..."**
3. Save to: `backend/uploads/` (or any accessible location)
4. **Recommended formats**: JPG, PNG (the ML analyzer supports both)

## Testing Checklist

- [ ] Test with **no damage** (clean vehicle)
- [ ] Test with **low severity** damage
- [ ] Test with **moderate severity** damage
- [ ] Test with **high severity** damage
- [ ] Test with **non-vehicle** image (should return `is_vehicle: false`)
- [ ] Test with **blurry/poor quality** image (should have lower confidence)

## Example Image URLs (Direct Links - Use with Caution)

⚠️ **Note**: Always verify image licenses before using in production.

### Low Severity Example
- Search Unsplash/Pexels for: "car scratch" or "minor car damage"

### Moderate Severity Example
- Search Unsplash/Pexels for: "damaged bumper" or "cracked headlight"

### High Severity Example
- Search Unsplash/Pexels for: "car accident" or "collision damage"

## Legal Reminder

- Always check and respect image licenses
- For production use, ensure images are properly licensed
- Consider using your own test images or purchasing stock photos
- Free sources (Unsplash, Pexels, Pixabay) are good for development/testing


