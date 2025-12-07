#!/usr/bin/env node

/**
 * Smart start script for Next.js frontend
 * - If production build exists (.next/BUILD_ID), runs production server
 * - Otherwise, automatically runs development server with helpful message
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID');

function hasProductionBuild() {
  try {
    return fs.existsSync(buildIdPath);
  } catch (error) {
    return false;
  }
}

if (hasProductionBuild()) {
  console.log('✅ Production build found. Starting production server...\n');
  execSync('next start', { stdio: 'inherit' });
} else {
  console.log('⚠️  No production build found in .next directory.');
  console.log('🚀 Starting development server instead...\n');
  console.log('💡 Tip: Run "npm run build" first if you want to use production mode.\n');
  execSync('next dev', { stdio: 'inherit' });
}

