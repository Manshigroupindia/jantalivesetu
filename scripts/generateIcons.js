const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, r, g, b, isMaskable = false) {
  // Simple uncompressed/deflated PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 2; // Truecolor (RGB)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk (Raw pixel data)
  const lineSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * lineSize);

  const cornerRadius = isMaskable ? 0 : Math.floor(width * 0.2);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = lineOffset + 1 + x * 3;

      // Draw rounded rectangle background
      let isInside = true;
      if (!isMaskable) {
        if (x < cornerRadius && y < cornerRadius) {
          isInside = (x - cornerRadius) ** 2 + (y - cornerRadius) ** 2 <= cornerRadius ** 2;
        } else if (x > width - cornerRadius && y < cornerRadius) {
          isInside = (x - (width - cornerRadius)) ** 2 + (y - cornerRadius) ** 2 <= cornerRadius ** 2;
        } else if (x < cornerRadius && y > height - cornerRadius) {
          isInside = (x - cornerRadius) ** 2 + (y - (height - cornerRadius)) ** 2 <= cornerRadius ** 2;
        } else if (x > width - cornerRadius && y > height - cornerRadius) {
          isInside = (x - (width - cornerRadius)) ** 2 + (y - (height - cornerRadius)) ** 2 <= cornerRadius ** 2;
        }
      }

      if (isInside) {
        // Red background with white center accent
        const isCenterAccent = x >= width * 0.3 && x <= width * 0.7 && y >= height * 0.35 && y <= height * 0.65;
        if (isCenterAccent) {
          rawData[pixelOffset] = 255;   // R
          rawData[pixelOffset + 1] = 255; // G
          rawData[pixelOffset + 2] = 255; // B
        } else {
          rawData[pixelOffset] = r;   // R (#DC2626)
          rawData[pixelOffset + 1] = g; // G
          rawData[pixelOffset + 2] = b; // B
        }
      } else {
        // Transparent / White padding outside rounded corner
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = calcCrc(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);

  return chunk;
}

function calcCrc(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192.png'), createPng(192, 192, 220, 38, 38, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512.png'), createPng(512, 512, 220, 38, 38, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512.png'), createPng(512, 512, 220, 38, 38, true));

console.log('Successfully generated PWA PNG icons!');
