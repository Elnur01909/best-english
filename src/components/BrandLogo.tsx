import React from 'react'

// AZEN brend loqosu — AZ: Azərbaycan bayrağı (mavi/qırmızı/yaşıl),
// EN: Britaniya bayrağı rəngləri (göy/qırmızı)
const AZ_GRADIENT = 'linear-gradient(135deg, #00B5E2 0%, #EF3340 50%, #3F9C35 100%)'
const EN_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #C8102E 100%)'
// Tünd fonlar üçün açıq tonlar
const AZ_GRADIENT_LIGHT = 'linear-gradient(135deg, #5BDCFF 0%, #FF8A93 50%, #7CE8A8 100%)'
const EN_GRADIENT_LIGHT = 'linear-gradient(135deg, #A5C8FF 0%, #FFA3A8 100%)'

const clipText: React.CSSProperties = {
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}

export function BrandWordmark({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <span className={`font-extrabold ${className}`} style={{ letterSpacing: '-0.02em' }}>
      <span style={{ ...clipText, backgroundImage: light ? AZ_GRADIENT_LIGHT : AZ_GRADIENT }}>AZ</span>
      <span style={{ ...clipText, backgroundImage: light ? EN_GRADIENT_LIGHT : EN_GRADIENT }}>EN</span>
    </span>
  )
}

export function BrandIcon({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-block shrink-0"
          style={{
            width: size, height: size,
            borderRadius: Math.round(size * 0.25),
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(15,23,42,0.35)',
            lineHeight: 0,
          }}>
      <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
        {/* Sol yarı: Azərbaycan bayrağı */}
        <rect x="0" y="0" width="16" height="11" fill="#00B5E2" />
        <rect x="0" y="11" width="16" height="10" fill="#EF3340" />
        <rect x="0" y="21" width="16" height="11" fill="#3F9C35" />
        <circle cx="7.2" cy="16" r="3" fill="#fff" />
        <circle cx="8.4" cy="16" r="2.5" fill="#EF3340" />
        {/* Sağ yarı: Britaniya bayrağı (sadələşdirilmiş) */}
        <g clipPath="url(#azen-uk)">
          <rect x="16" y="0" width="16" height="32" fill="#012169" />
          <path d="M16 0 L32 32 M32 0 L16 32" stroke="#fff" strokeWidth="5" />
          <path d="M16 0 L32 32 M32 0 L16 32" stroke="#C8102E" strokeWidth="2" />
          <path d="M24 0 V32 M16 16 H32" stroke="#fff" strokeWidth="7" />
          <path d="M24 0 V32 M16 16 H32" stroke="#C8102E" strokeWidth="4" />
        </g>
        <defs>
          <clipPath id="azen-uk"><rect x="16" y="0" width="16" height="32" /></clipPath>
        </defs>
      </svg>
    </span>
  )
}

export default function BrandLogo({
  iconSize = 30,
  textClassName = 'text-base',
  light = false,
}: {
  iconSize?: number
  textClassName?: string
  light?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <BrandIcon size={iconSize} />
      <BrandWordmark light={light} className={textClassName} />
    </span>
  )
}
