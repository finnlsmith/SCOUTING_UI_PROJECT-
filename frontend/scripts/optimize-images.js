#!/usr/bin/env node

/**
 * Image Optimization Script
 * Provides instructions and helper for image optimization
 * 
 * Usage: node scripts/optimize-images.js
 * 
 * For actual optimization, use online tools:
 * - https://squoosh.app/ (Google's image compression tool)
 * - https://tinypng.com/ (PNG/JPEG compression)
 * - https://convertio.co/png-webp/ (Convert to WebP)
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../src/assets');
const imageExtensions = ['.png', '.jpg', '.jpeg'];

function getAllImages(dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllImages(fullPath));
    } else if (imageExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function main() {
  console.log('🖼️  Image Optimization Guide\n');
  console.log('This script identifies images that can be optimized.\n');
  
  if (!fs.existsSync(assetsDir)) {
    console.log(`Assets directory not found: ${assetsDir}`);
    return;
  }
  
  const images = getAllImages(assetsDir);
  
  if (images.length === 0) {
    console.log('No images found to optimize.');
    return;
  }
  
  console.log(`Found ${images.length} image(s) that can be optimized:\n`);
  
  images.forEach(imgPath => {
    const relPath = path.relative(process.cwd(), imgPath);
    const stat = fs.statSync(imgPath);
    const sizeKB = (stat.size / 1024).toFixed(2);
    console.log(`  - ${relPath} (${sizeKB} KB)`);
  });
  
  console.log('\n📝 Optimization Recommendations:');
  console.log('  1. Convert images to WebP format for better compression');
  console.log('  2. Compress PNG/JPEG images using tools like:');
  console.log('     - https://squoosh.app/');
  console.log('     - https://tinypng.com/');
  console.log('  3. Use responsive images with srcset for different screen sizes');
  console.log('  4. Consider lazy loading images below the fold');
  console.log('\n✅ After optimization, update component imports to use .webp files where supported.');
}

if (require.main === module) {
  main();
}

module.exports = { getAllImages };

