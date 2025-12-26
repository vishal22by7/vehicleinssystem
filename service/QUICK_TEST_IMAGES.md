# Quick Test Images - Direct Download Links

## 🚀 Fastest Way to Get Test Images

### Option 1: Unsplash (Recommended - No Sign-up Required)

**Low Severity (0-30):**
- Minor scratches: https://unsplash.com/s/photos/car-scratch
- Small dents: https://unsplash.com/s/photos/small-dent-car

**Moderate Severity (31-60):**
- Damaged bumper: https://unsplash.com/s/photos/damaged-car-bumper
- Cracked headlight: https://unsplash.com/s/photos/cracked-headlight

**High Severity (61-90):**
- Car accident: https://unsplash.com/s/photos/car-accident
- Collision damage: https://unsplash.com/s/photos/car-collision

**Critical Severity (91-100):**
- Totaled car: https://unsplash.com/s/photos/totaled-car
- Car wreck: https://unsplash.com/s/photos/car-wreck

### Option 2: Pexels (Also Free, No Sign-up)

**Search Terms:**
- https://www.pexels.com/search/car%20accident/
- https://www.pexels.com/search/damaged%20car/
- https://www.pexels.com/search/car%20damage/

### Option 3: Pixabay (Free, No Sign-up)

**Search Terms:**
- https://pixabay.com/images/search/car%20accident/
- https://pixabay.com/images/search/damaged%20car/

## 📥 How to Download

1. **Click any link above**
2. **Browse the images**
3. **Right-click** on an image you like
4. **Select "Save image as..."** or **"Save picture as..."**
5. **Save to**: `backend/uploads/` folder (or any location accessible to your backend)

## ✅ Quick Test Checklist

Download at least **3-5 images** covering:
- [ ] Low severity (minor scratches/dents)
- [ ] Moderate severity (cracked lights, damaged bumpers)  
- [ ] High severity (major collision damage)
- [ ] One clean/undamaged vehicle (to test low severity detection)

## 🧪 Testing in VIMS

1. **Start all services** (use `npm run dev` or `start-all.ps1`)
2. **Log in** to the frontend
3. **Create a policy** (if you don't have one)
4. **Submit a claim** with one of the downloaded images
5. **Check the ML Analysis** column in the Claims page
6. **Verify**:
   - Severity score (0-100)
   - Confidence level
   - ML Report CID (should be uploaded to IPFS)

## 💡 Pro Tips

- **Use your own photos**: Take photos of vehicles (with permission) for realistic testing
- **Test edge cases**: Try blurry images, non-vehicle images, very dark/bright images
- **Check logs**: Watch the ML analyzer terminal for detailed analysis logs
- **Verify IPFS**: Check that `mlReportCID` appears in the claim after submission

## 🔍 What to Look For

After submitting a claim, you should see:
- ✅ **Severity**: A number between 0-100
- ✅ **Confidence**: A number between 0.0-1.0
- ✅ **ML Report CID**: An IPFS hash (like `QmXxx...`)
- ✅ **Progress Bar**: Visual representation of severity

If any of these are missing, check the ML analyzer logs for errors.

