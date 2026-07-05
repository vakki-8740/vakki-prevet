const fs = require('fs');
const path = require('path');

const iconSVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#007AFF"/>
      <stop offset="100%" stop-color="#5856D6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  <g transform="translate(${size * 0.2}, ${size * 0.18}) scale(${size * 0.006})">
    <path d="M20 38C20 38 22 28 32 28C42 28 44 38 44 38" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M16 38C16 38 20 44 32 44C44 44 48 38 48 38" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M32 24V48" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="22" r="3" fill="white"/>
  </g>
</svg>`;

const iconsDir = path.join(__dirname, 'frontend', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svg = iconSVG(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
});

// Create a simple HTML page to convert SVG to PNG
const converterHTML = `<!DOCTYPE html>
<html>
<body>
<script>
const sizes = ${JSON.stringify(sizes)};
async function convertAll() {
  for (const size of sizes) {
    const response = await fetch('icons/icon-' + size + '.svg');
    const svgText = await response.text();
    const img = new Image();
    const blob = new Blob([svgText], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    img.src = url;
    await new Promise(r => img.onload = r);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const link = document.createElement('a');
    link.download = 'icon-' + size + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    URL.revokeObjectURL(url);
  }
  alert('Done! Check downloads folder.');
}
convertAll();
</script>
<p>Click to generate PNG icons</p>
<button onclick="convertAll()">Generate Icons</button>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'generate-icons.html'), converterHTML);
console.log('\nOpen generate-icons.html in browser to create PNG files');
console.log('Then place them in frontend/icons/');
