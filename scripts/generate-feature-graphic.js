// Play Store feature graphic (1024×500): node scripts/generate-feature-graphic.js
const sharp = require('sharp')
const path = require('path')

const svg = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="55%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>

  <!-- dekorativ dairələr -->
  <circle cx="950" cy="60" r="160" fill="#ffffff" opacity="0.05"/>
  <circle cx="880" cy="470" r="220" fill="#ffffff" opacity="0.05"/>
  <circle cx="120" cy="450" r="100" fill="#ffffff" opacity="0.04"/>

  <!-- BE loqo kartı -->
  <rect x="80" y="140" width="220" height="220" rx="48" fill="url(#logo)" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>
  <text x="190" y="272" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="800" fill="#ffffff" text-anchor="middle">BE</text>
  <rect x="135" y="305" width="110" height="12" rx="6" fill="#fbbf24"/>

  <!-- başlıq -->
  <text x="360" y="225" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" fill="#ffffff">Best English</text>
  <text x="362" y="285" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="400" fill="#bfdbfe">TOLES və ingilis dili — elmi metodlarla</text>

  <!-- xüsusiyyət nişanları -->
  <g font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600" fill="#ffffff">
    <rect x="362" y="320" width="160" height="44" rx="22" fill="#ffffff" opacity="0.14"/>
    <text x="442" y="349" text-anchor="middle">1600+ sual</text>
    <rect x="538" y="320" width="150" height="44" rx="22" fill="#ffffff" opacity="0.14"/>
    <text x="613" y="349" text-anchor="middle">27 dərs</text>
    <rect x="704" y="320" width="200 " height="44" rx="22" fill="#ffffff" opacity="0.14"/>
    <text x="804" y="349" text-anchor="middle">SRS lüğət sistemi</text>
  </g>
</svg>`

const out = path.join(__dirname, '..', '..', 'best-english-android-release', 'feature-graphic.png')
sharp(Buffer.from(svg)).png().toFile(out).then(() => console.log('Yaradıldı:', out))
