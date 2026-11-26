#!/usr/bin/env node
/**
 * Generate PWA icons from favicon.svg
 * Run: node scripts/generate-icons.js
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

const svgPath = join(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { size: 180, name: 'icon-180x180.png' },     // Apple touch icon
  { size: 192, name: 'icon-192x192.png' },     // Android/PWA
  { size: 512, name: 'icon-512x512.png' },     // PWA splash
];

async function generateIcons() {
  console.log('Generating PWA icons from favicon.svg...');
  
  for (const { size, name } of sizes) {
    const outputPath = join(publicDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ Generated ${name} (${size}x${size})`);
  }
  
  console.log('Done! Icons generated in frontend/public/');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
