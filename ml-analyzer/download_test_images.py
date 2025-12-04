"""
Script to download sample vehicle damage images for testing ML analysis
Uses Unsplash API (free, no key required for basic usage)
"""

import requests
import os
import json
from pathlib import Path

# Create test images directory
TEST_IMAGES_DIR = Path("test_images")
TEST_IMAGES_DIR.mkdir(exist_ok=True)

# Unsplash API (public access, no key needed for basic searches)
UNSPLASH_API = "https://api.unsplash.com"
UNSPLASH_SEARCH = f"{UNSPLASH_API}/search/photos"

def download_image(url, filepath):
    """Download an image from URL"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"✅ Downloaded: {filepath.name}")
            return True
        else:
            print(f"❌ Failed to download: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error downloading {url}: {e}")
        return False

def search_unsplash(query, per_page=5):
    """Search Unsplash for images (using public API)"""
    try:
        # Note: Unsplash API requires authentication for production use
        # For testing, we'll use direct image URLs from Unsplash website
        print(f"🔍 Searching for: {query}")
        print("⚠️  Note: For automated downloads, you'll need an Unsplash API key")
        print("   Visit: https://unsplash.com/developers")
        print("   For now, manually download from: https://unsplash.com/s/photos/" + query.replace(" ", "-"))
        return []
    except Exception as e:
        print(f"❌ Search error: {e}")
        return []

def download_from_pexels(query, count=3):
    """Download images from Pexels (requires manual download)"""
    print(f"\n📥 Pexels Images for '{query}':")
    print(f"   Visit: https://www.pexels.com/search/{query.replace(' ', '%20')}/")
    print("   Right-click images and save to test_images/ folder")

def download_from_pixabay(query, count=3):
    """Download images from Pixabay (requires manual download)"""
    print(f"\n📥 Pixabay Images for '{query}':")
    print(f"   Visit: https://pixabay.com/images/search/{query.replace(' ', '%20')}/")
    print("   Right-click images and save to test_images/ folder")

def main():
    print("=" * 60)
    print("Vehicle Damage Test Images Downloader")
    print("=" * 60)
    print()
    
    # Test image categories
    test_categories = {
        "low_severity": [
            "car scratch",
            "minor car damage",
            "small dent car"
        ],
        "moderate_severity": [
            "damaged car bumper",
            "cracked car headlight",
            "car door damage"
        ],
        "high_severity": [
            "car accident damage",
            "severe car collision",
            "major car damage"
        ],
        "critical_severity": [
            "totaled car",
            "extreme car damage",
            "car wreck"
        ],
        "no_damage": [
            "clean car",
            "new car",
            "undamaged vehicle"
        ]
    }
    
    print("📋 Recommended Test Image Categories:")
    print()
    for category, queries in test_categories.items():
        print(f"  {category.upper().replace('_', ' ')}:")
        for query in queries:
            print(f"    - {query}")
    print()
    
    print("=" * 60)
    print("Download Instructions:")
    print("=" * 60)
    print()
    print("Since automated downloads require API keys, here are manual options:")
    print()
    
    # Provide direct links
    print("🌐 Quick Download Links:")
    print()
    print("1. Unsplash (Free, High Quality):")
    for category, queries in test_categories.items():
        if category != "no_damage":  # Skip no_damage for now
            query = queries[0].replace(" ", "-")
            print(f"   - {category}: https://unsplash.com/s/photos/{query}")
    print()
    
    print("2. Pexels (Free, High Quality):")
    for category, queries in test_categories.items():
        if category != "no_damage":
            query = queries[0].replace(" ", "%20")
            print(f"   - {category}: https://www.pexels.com/search/{query}/")
    print()
    
    print("3. Pixabay (Free, High Quality):")
    for category, queries in test_categories.items():
        if category != "no_damage":
            query = queries[0].replace(" ", "%20")
            print(f"   - {category}: https://pixabay.com/images/search/{query}/")
    print()
    
    print("=" * 60)
    print("Manual Download Steps:")
    print("=" * 60)
    print()
    print("1. Visit any of the links above")
    print("2. Browse and select appropriate images")
    print("3. Right-click image → 'Save image as...'")
    print(f"4. Save to: {TEST_IMAGES_DIR.absolute()}")
    print("5. Use these images when submitting claims in the VIMS frontend")
    print()
    
    print("=" * 60)
    print("Testing Checklist:")
    print("=" * 60)
    print()
    print("After downloading images, test with:")
    print("  ✓ Low severity damage (scratches, small dents)")
    print("  ✓ Moderate severity (cracked lights, damaged bumpers)")
    print("  ✓ High severity (major collisions)")
    print("  ✓ Critical severity (totaled vehicles)")
    print("  ✓ No damage (clean vehicle - should show low severity)")
    print("  ✓ Non-vehicle image (should return is_vehicle: false)")
    print()
    
    print(f"📁 Test images directory: {TEST_IMAGES_DIR.absolute()}")
    print()
    print("💡 Tip: You can also use your own vehicle photos for testing!")

if __name__ == "__main__":
    main()

