import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate a valid PNG buffer with RGBA pixels
function createPng(width, height, red, green, blue, alpha = 255) {
  // 1. PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth: 8
  ihdrData[9] = 6; // color type: 6 (RGBA)
  ihdrData[10] = 0; // compression method: 0
  ihdrData[11] = 0; // filter method: 0
  ihdrData[12] = 0; // interlace method: 0

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // 3. IDAT Chunk (Raw scanlines: 1 filter byte + width * 4 bytes per row)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Add a subtle border or inner pattern
      const isBorder = x < 8 || x >= width - 8 || y < 8 || y >= height - 8;
      if (isBorder) {
        rawData[pixelOffset] = 180; // R (Darker red border)
        rawData[pixelOffset + 1] = 20; // G
        rawData[pixelOffset + 2] = 20; // B
        rawData[pixelOffset + 3] = alpha;
      } else {
        rawData[pixelOffset] = red; // R (Brand red #DC2626 -> 220, 38, 38)
        rawData[pixelOffset + 1] = green; // G
        rawData[pixelOffset + 2] = blue; // B
        rawData[pixelOffset + 3] = alpha;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // 4. IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation for PNG chunks
function createChunk(type, data) {
  const len = data.length;
  const buffer = Buffer.alloc(8 + len + 4);

  buffer.writeUInt32BE(len, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crcTarget = buffer.subarray(4, 8 + len);
  const crc = crc32(crcTarget);
  buffer.writeUInt32BE(crc, 8 + len);

  return buffer;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    for (let j = 0; j < 8; j++) {
      const bit = (crc ^ byte) & 1;
      crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

// Ensure public directory exists
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Brand color: #DC2626 -> RGB(220, 38, 38)
const pwa192 = createPng(192, 192, 220, 38, 38);
const pwa512 = createPng(512, 512, 220, 38, 38);
const pwaMaskable = createPng(512, 512, 220, 38, 38);
const appleIcon = createPng(180, 180, 220, 38, 38);
const faviconPng = createPng(64, 64, 220, 38, 38);

fs.writeFileSync(path.join(publicDir, 'pwa-192.png'), pwa192);
fs.writeFileSync(path.join(publicDir, 'pwa-512.png'), pwa512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512.png'), pwaMaskable);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconPng);

console.log('[PNG Generator] Successfully generated static PNG icons in public/:');
console.log(' - public/pwa-192.png (192x192 PNG)');
console.log(' - public/pwa-512.png (512x512 PNG)');
console.log(' - public/pwa-maskable-512.png (512x512 PNG)');
console.log(' - public/apple-touch-icon.png (180x180 PNG)');
console.log(' - public/favicon.png (64x64 PNG)');
