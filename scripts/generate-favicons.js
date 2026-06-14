import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'favicon.svg');
const publicDir = path.join(rootDir, 'public');

async function generatePng(size) {
  return await sharp(svgPath)
    .resize(size, size)
    .png()
    .toBuffer();
}

function createIco(pngBuffers) {
  // pngBuffers is an array of { width, height, buffer }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Image type (1 for ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  const directoryEntries = [];
  let currentOffset = 6 + pngBuffers.length * 16;

  for (const png of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(png.width >= 256 ? 0 : png.width, 0);
    entry.writeUInt8(png.height >= 256 ? 0 : png.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(png.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data
    
    directoryEntries.push(entry);
    currentOffset += png.buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...pngBuffers.map(p => p.buffer)]);
}

async function run() {
  try {
    if (!fs.existsSync(svgPath)) {
      console.error(`SVG source not found at: ${svgPath}`);
      process.exit(1);
    }

    console.log('Generating PNG favicons...');
    const png16 = await generatePng(16);
    const png32 = await generatePng(32);
    const png48 = await generatePng(48);
    const png180 = await generatePng(180);
    const png192 = await generatePng(192);
    const png512 = await generatePng(512);

    // Save PNG files
    fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), png16);
    fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
    fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), png48);
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
    fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), png192);
    fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), png512);
    console.log('Saved all PNG files successfully.');

    // Generate and save favicon.ico containing 16, 32, and 48 sizes
    console.log('Creating multi-resolution favicon.ico...');
    const icoBuffer = createIco([
      { width: 16, height: 16, buffer: png16 },
      { width: 32, height: 32, buffer: png32 },
      { width: 48, height: 48, buffer: png48 }
    ]);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
    console.log('Saved favicon.ico successfully.');

    console.log('Favicon generation completed successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

run();
