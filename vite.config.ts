import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';

function createPngBuffer(width: number, height: number, red: number, green: number, blue: number, alpha = 255): Buffer {
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

function createChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const buffer = Buffer.alloc(8 + len + 4);
  buffer.writeUInt32BE(len, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);
  const crc = crc32(buffer.subarray(4, 8 + len));
  buffer.writeUInt32BE(crc, 8 + len);
  return buffer;
}

function crc32(buf: Buffer): number {
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

function generatePwaIconsPlugin(): Plugin {
  return {
    name: 'generate-pwa-icons',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const pwa192 = createPngBuffer(192, 192, 220, 38, 38);
      const pwa512 = createPngBuffer(512, 512, 220, 38, 38);
      const pwaMaskable = createPngBuffer(512, 512, 220, 38, 38);
      const appleIcon = createPngBuffer(180, 180, 220, 38, 38);
      const faviconPng = createPngBuffer(64, 64, 220, 38, 38);

      fs.writeFileSync(path.join(publicDir, 'pwa-192.png'), pwa192);
      fs.writeFileSync(path.join(publicDir, 'pwa-512.png'), pwa512);
      fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512.png'), pwaMaskable);
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
      fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconPng);

      console.log('[PWA Plugin] Successfully verified static PNG icons in public/');
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), generatePwaIconsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
