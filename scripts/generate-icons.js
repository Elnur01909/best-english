// PWA ikonlarını SVG-dən generasiya edir: node scripts/generate-icons.js
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

// "BE" loqosu — mavi gradient fonda ağ hərflər
function makeSvg(padding) {
  // padding: maskable üçün təhlükəsiz zona (kənarlardan ~20%)
  const inner = 512 - padding * 2
  const fontSize = Math.round(inner * 0.42)
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${padding > 0 ? 0 : 96}" fill="url(#bg)"/>
  <text x="256" y="${256 + fontSize * 0.35}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff" text-anchor="middle">BE</text>
  <rect x="${256 - inner * 0.28}" y="${256 + fontSize * 0.55}" width="${inner * 0.56}" height="${Math.max(8, inner * 0.045)}" rx="${Math.max(4, inner * 0.022)}" fill="#fbbf24"/>
</svg>`
}

async function main() {
  const normal = Buffer.from(makeSvg(0))
  const maskable = Buffer.from(makeSvg(80))

  await sharp(normal).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'))
  await sharp(normal).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'))
  await sharp(maskable).resize(192, 192).png().toFile(path.join(outDir, 'icon-maskable-192.png'))
  await sharp(maskable).resize(512, 512).png().toFile(path.join(outDir, 'icon-maskable-512.png'))
  console.log('İkonlar yaradıldı:', outDir)
}

main().catch((e) => { console.error(e); process.exit(1) })
