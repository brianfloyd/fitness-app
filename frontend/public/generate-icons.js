// Script to generate PNG icons from SVG for PWA
// Run with: node generate-icons.js

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Try to use sharp if available, otherwise provide instructions
async function generateIcons() {
  try {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync('./favicon.svg');
    
    // Generate 192x192 icon
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile('./icon-192x192.png');
    console.log('✓ Generated icon-192x192.png');
    
    // Generate 512x512 icon
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile('./icon-512x512.png');
    console.log('✓ Generated icon-512x512.png');
    
    // Generate 180x180 icon for iOS
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile('./icon-180x180.png');
    console.log('✓ Generated icon-180x180.png');
    
    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Sharp not found. Installing...');
      console.log('Run: npm install --save-dev sharp');
      console.log('Then run this script again.');
    } else {
      console.error('Error generating icons:', error);
    }
  }
}

generateIcons();
