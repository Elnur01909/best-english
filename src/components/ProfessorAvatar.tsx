'use client'

export type ProfessorMood = 'neutral' | 'happy' | 'annoyed'

const MOOD_ANIMATION: Record<ProfessorMood, string> = {
  neutral: '',
  happy: 'animate-professor-laugh',
  annoyed: 'animate-professor-shake',
}

// Bədən proporsiyası: viewBox 100 (en) x 180 (hündürlük)
const ASPECT = 1.8

/**
 * Virtual professor persona — tam bədən qrafik müəllim personajı.
 * Düzgün cavabda gülür/sevinir/əllərini qaldırır, səhv cavabda əsəbiləşir/qollarını çarpazlayır.
 */
export default function ProfessorAvatar({
  mood = 'neutral',
  size = 64,
  className = '',
}: {
  mood?: ProfessorMood
  size?: number
  className?: string
}) {
  const width = size
  const height = Math.round(size * ASPECT)

  return (
    <div
      className={`relative inline-block shrink-0 ${MOOD_ANIMATION[mood]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 180" width={width} height={height}>
        {/* ====== AYAQLAR ====== */}
        <rect x="40" y="130" width="8" height="34" rx="2" fill="#27272a" />
        <rect x="52" y="130" width="8" height="34" rx="2" fill="#27272a" />
        <ellipse cx="44" cy="166" rx="7" ry="4" fill="#111827" />
        <ellipse cx="56" cy="166" rx="7" ry="4" fill="#111827" />

        {/* ====== QOLLAR (mood-a görə fərqli pozisiya) ====== */}
        {mood === 'happy' ? (
          <>
            <path d="M32 84 Q16 68 9 48" stroke="#374151" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="9" cy="48" r="5.5" fill="#f3c9a3" />
            <path d="M68 84 Q84 68 91 48" stroke="#374151" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="91" cy="48" r="5.5" fill="#f3c9a3" />
          </>
        ) : mood === 'annoyed' ? (
          <>
            <path d="M30 84 Q50 102 70 90" stroke="#374151" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M70 84 Q50 110 30 96" stroke="#4b5563" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="70" cy="90" r="5.5" fill="#f3c9a3" />
            <circle cx="30" cy="96" r="5.5" fill="#f3c9a3" />
          </>
        ) : (
          <>
            <path d="M32 84 Q21 108 27 128" stroke="#374151" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="27" cy="128" r="5.5" fill="#f3c9a3" />
            <path d="M68 84 Q79 108 73 128" stroke="#374151" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="73" cy="128" r="5.5" fill="#f3c9a3" />
            {/* dərslik kitabı */}
            <rect x="65" y="120" width="16" height="11" rx="1.5" fill="#7c2d12" />
            <line x1="73" y1="121" x2="73" y2="130" stroke="#fcd34d" strokeWidth="1" />
          </>
        )}

        {/* ====== GÖVDƏ / PİJAK ====== */}
        <path d="M29 86 Q50 76 71 86 L66 134 Q50 142 34 134 Z" fill="#374151" />
        {/* köynək yaxası */}
        <path d="M44 86 L50 104 L56 86 Z" fill="#f9fafb" />
        {/* qalstuk */}
        <path d="M48 88 L52 88 L53 100 L50 110 L47 100 Z" fill="#9f1239" />
        {/* boyun */}
        <rect x="45" y="76" width="10" height="12" rx="3" fill="#f3c9a3" />

        {/* ====== BAŞ (üz, eynək, papaq) ====== */}
        <g transform="translate(22.5 0.3) scale(0.55)">
          {/* saç */}
          <path d="M14 50 a36 36 0 0 1 72 0 Z" fill="#9ca3af" />
          {/* üz */}
          <circle cx="50" cy="54" r="36" fill="#f3c9a3" />

          {/* qaşlar */}
          {mood === 'annoyed' ? (
            <>
              <path d="M30 40 L45 46" stroke="#57534e" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M70 40 L55 46" stroke="#57534e" strokeWidth="3.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M30 41 Q37.5 36 45 41" stroke="#57534e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M55 41 Q62.5 36 70 41" stroke="#57534e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          )}

          {/* eynək */}
          <circle cx="38" cy="52" r="10.5" fill="none" stroke="#3f3f46" strokeWidth="2.5" />
          <circle cx="62" cy="52" r="10.5" fill="none" stroke="#3f3f46" strokeWidth="2.5" />
          <line x1="48.5" y1="52" x2="51.5" y2="52" stroke="#3f3f46" strokeWidth="2.5" />

          {/* gözlər */}
          {mood === 'happy' ? (
            <>
              <path d="M33.5 52 Q38 47.5 42.5 52" stroke="#3f3f46" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M57.5 52 Q62 47.5 66.5 52" stroke="#3f3f46" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="38" cy="52" r="2.6" fill="#3f3f46" />
              <circle cx="62" cy="52" r="2.6" fill="#3f3f46" />
            </>
          )}

          {/* bığ */}
          <path d="M39 67 Q50 62.5 61 67 Q50 71.5 39 67 Z" fill="#a8a29e" />

          {/* ağız */}
          {mood === 'happy' ? (
            <path d="M40 75 Q50 86 60 75" stroke="#9f1239" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : mood === 'annoyed' ? (
            <path d="M40 80 Q50 71 60 80" stroke="#9f1239" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <line x1="43" y1="77" x2="57" y2="77" stroke="#9f1239" strokeWidth="3" strokeLinecap="round" />
          )}

          {/* professor papağı (mortarboard) */}
          <g transform="translate(50 16)">
            <rect x="-20" y="0" width="40" height="6" rx="2" fill="#27272a" />
            <polygon points="-25,3 25,3 0,-9" fill="#18181b" />
            <line x1="0" y1="-9" x2="15" y2="9" stroke="#d4af37" strokeWidth="1.5" />
            <circle cx="15" cy="11" r="2.5" fill="#d4af37" />
          </g>
        </g>
      </svg>

      {mood === 'annoyed' && (
        <span className="absolute top-0 -right-1 text-lg animate-professor-pop select-none">💢</span>
      )}
      {mood === 'happy' && (
        <span className="absolute top-0 -right-1 text-lg animate-professor-pop select-none">✨</span>
      )}
    </div>
  )
}
