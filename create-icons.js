const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  // Create a simple blue gradient PNG
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Blue gradient
      const t = (x + y) / (size * 2);
      pixels[idx] = Math.round(0 + t * 88);     // R
      pixels[idx + 1] = Math.round(122 - t * 36); // G
      pixels[idx + 2] = Math.round(255 - t * 41); // B
      pixels[idx + 3] = 255; // A

      // Draw cloud icon in center
      const cx = x - size / 2;
      const cy = y - size / 2;
      const scale = size / 100;
      const dx = cx / scale;
      const dy = cy / scale;

      // Simple cloud shape
      const inCloud =
        (dx * dx + (dy + 5) * (dy + 5) < 200) || // left circle
        (dx * dx + (dy + 5) * (dy + 5) < 200) || // right circle
        ((dx - 8) * (dx - 8) + (dy + 8) * (dy + 8) < 100) ||
        ((dx + 8) * (dx + 8) + (dy + 8) * (dy + 8) < 100) ||
        (Math.abs(dx) < 15 && Math.abs(dy + 5) < 8);

      if (inCloud && dy < 5 && dy > -15) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      }
    }
  }

  // PNG file structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data with filter bytes
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(raw);

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'frontend', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  console.log(`Created icon-${size}.png (${png.length} bytes)`);
});

console.log('All icons created!');
