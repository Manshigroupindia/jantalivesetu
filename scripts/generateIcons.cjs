const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPngBuffer(width, height, red, green, blue, alpha = 255) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const isBorder = x < 8 || x >= width - 8 || y < 8 || y >= height - 8;
      if (isBorder) {
        rawData[pixelOffset] = 180;
        rawData[pixelOffset + 1] = 20;
        rawData[pixelOffset + 2] = 20;
        rawData[pixelOffset + 3] = alpha;
      } else {
        rawData[pixelOffset] = red;
        rawData[pixelOffset + 1] = green;
        rawData[pixelOffset + 2] = blue;
        rawData[pixelOffset + 3] = alpha;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buffer = Buffer.alloc(8 + len + 4);
  buffer.writeUInt32BE(len, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);
  const crc = crc32(buffer.subarray(4, 8 + len));
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

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192.png'), createPngBuffer(192, 192, 220, 38, 38));
fs.writeFileSync(path.join(publicDir, 'pwa-512.png'), createPngBuffer(512, 512, 220, 38, 38));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512.png'), createPngBuffer(512, 512, 220, 38, 38));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPngBuffer(180, 180, 220, 38, 38));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), createPngBuffer(64, 64, 220, 38, 38));

console.log('[Script] PWA static PNG icons successfully written to public/');
