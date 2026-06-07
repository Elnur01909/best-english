'use client'

export type ProfessorMood = 'neutral' | 'happy' | 'annoyed'

const MOOD_ANIMATION: Record<ProfessorMood, string> = {
  neutral: '',
  happy: 'animate-professor-laugh',
  annoyed: 'animate-professor-shake',
}

// Bədən proporsiyası: viewBox 100 (en) x 124 (hündürlük) — "mascot" tipli, isti illüstrasiya
const ASPECT = 1.24

let uid = 0

/**
 * Virtual professor persona — illüstrasiya tərzində mini-maskot müəllim.
 * Düzgün cavabda gülümsəyir/sevinir, səhv cavabda qaşqabaqlı/əsəbi olur.
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
  const id = (uid++).toString()
  const skinGrad = `profSkin${id}`
  const robeGrad = `profRobe${id}`
  const capGrad = `profCap${id}`

  return (
    <div
      className={`relative inline-block shrink-0 ${MOOD_ANIMATION[mood]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 124" width={width} height={height}>
        <defs>
          <linearGradient id={skinGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe2c2" />
            <stop offset="100%" stopColor="#ffcb9b" />
          </linearGradient>
          <linearGradient id={robeGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c6ae8" />
            <stop offset="100%" stopColor="#5b4bd6" />
          </linearGradient>
          <linearGradient id={capGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f3a5e" />
            <stop offset="100%" stopColor="#2c2845" />
          </linearGradient>
        </defs>

        {/* kölgə */}
        <ellipse cx="50" cy="118" rx="26" ry="5" fill="#000" opacity="0.08" />

        {/* ====== QOLLAR (mood-a görə) ====== */}
        {mood === 'happy' ? (
          <>
            <path d="M30 78 Q14 64 12 46" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="12" cy="45" r="7" fill={`url(#${skinGrad})`} />
            <path d="M70 78 Q86 64 88 46" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="88" cy="45" r="7" fill={`url(#${skinGrad})`} />
          </>
        ) : mood === 'annoyed' ? (
          <>
            <path d="M30 78 Q50 92 67 84" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <path d="M70 78 Q50 96 33 88" stroke="#6c5ce0" strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="67" cy="84" r="7" fill={`url(#${skinGrad})`} />
            <circle cx="33" cy="88" r="7" fill={`url(#${skinGrad})`} />
          </>
        ) : (
          <>
            <path d="M30 78 Q19 96 28 110" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="28" cy="110" r="7" fill={`url(#${skinGrad})`} />
            <path d="M70 78 Q81 96 72 110" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="72" cy="110" r="7" fill={`url(#${skinGrad})`} />
            {/* kitab */}
            <rect x="63" y="100" width="18" height="13" rx="2" fill="#fff" stroke="#e2dcff" strokeWidth="1.5" />
            <line x1="72" y1="101" x2="72" y2="112" stroke="#a594ff" strokeWidth="1.5" />
          </>
        )}

        {/* ====== GÖVDƏ / AKADEMIK CÜBBƏ ====== */}
        <path d="M28 76 Q50 66 72 76 Q78 96 70 116 Q50 122 30 116 Q22 96 28 76 Z" fill={`url(#${robeGrad})`} />
        {/* köynək yaxası */}
        <path d="M43 76 L50 92 L57 76 Z" fill="#fbfaff" />
        {/* kəpənək qalstuk */}
        <path d="M50 80 L43 76 Q50 73 57 76 Z" fill="#ef5b6f" />
        <circle cx="50" cy="79" r="2.2" fill="#d63b51" />
        {/* boyun */}
        <rect x="44.5" y="66" width="11" height="12" rx="4" fill={`url(#${skinGrad})`} />

        {/* ====== BAŞ ====== */}
        {/* qulaqlar */}
        <circle cx="22" cy="48" r="6" fill={`url(#${skinGrad})`} />
        <circle cx="78" cy="48" r="6" fill={`url(#${skinGrad})`} />
        {/* saç (yan tufts) */}
        <path d="M16 44 Q14 34 22 30" stroke="#c7c2d6" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M84 44 Q86 34 78 30" stroke="#c7c2d6" strokeWidth="6" fill="none" strokeLinecap="round" />

        {/* üz */}
        <circle cx="50" cy="42" r="30" fill={`url(#${skinGrad})`} />

        {/* yanaq allığı */}
        <ellipse cx="32" cy="49" rx="5.5" ry="3.5" fill="#ff9d8a" opacity="0.45" />
        <ellipse cx="68" cy="49" rx="5.5" ry="3.5" fill="#ff9d8a" opacity="0.45" />

        {/* qaşlar */}
        {mood === 'annoyed' ? (
          <>
            <path d="M33 33 Q40 38 46 36" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M67 33 Q60 38 54 36" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M33 34 Q39.5 30 46 33.5" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M54 33.5 Q60.5 30 67 34" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* eynək */}
        <rect x="29" y="38" width="16" height="13" rx="6" fill="rgba(255,255,255,0.35)" stroke="#564f72" strokeWidth="2.4" />
        <rect x="55" y="38" width="16" height="13" rx="6" fill="rgba(255,255,255,0.35)" stroke="#564f72" strokeWidth="2.4" />
        <line x1="45" y1="44" x2="55" y2="44" stroke="#564f72" strokeWidth="2.4" />

        {/* gözlər */}
        {mood === 'happy' ? (
          <>
            <path d="M33 45 Q37 41 41 45" stroke="#4a4360" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M59 45 Q63 41 67 45" stroke="#4a4360" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'annoyed' ? (
          <>
            <ellipse cx="37" cy="45.5" rx="2.6" ry="3" fill="#4a4360" />
            <ellipse cx="63" cy="45.5" rx="2.6" ry="3" fill="#4a4360" />
          </>
        ) : (
          <>
            <circle cx="37" cy="45" r="2.6" fill="#4a4360" />
            <circle cx="63" cy="45" r="2.6" fill="#4a4360" />
          </>
        )}

        {/* bığ */}
        <path d="M40 56 Q50 52 60 56 Q50 59.5 40 56 Z" fill="#a89fc2" />

        {/* ağız */}
        {mood === 'happy' ? (
          <path d="M41 62 Q50 70.5 59 62" stroke="#c1395a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        ) : mood === 'annoyed' ? (
          <path d="M42 65 Q50 59.5 58 65" stroke="#c1395a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M44 62.5 Q50 64.5 56 62.5" stroke="#c1395a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        )}

        {/* akademik papaq (mortarboard) */}
        <g transform="translate(50 17)">
          <path d="M-15 0 Q0 -6 15 0 Q0 6 -15 0 Z" fill={`url(#${capGrad})`} />
          <polygon points="-21,0 21,0 0,-13" fill="#252140" />
          <line x1="0" y1="-13" x2="13" y2="6" stroke="#f0c75e" strokeWidth="1.6" />
          <circle cx="13" cy="9" r="2.6" fill="#f0c75e" />
        </g>
      </svg>

      {mood === 'annoyed' && (
        <span className="absolute top-1 -right-1 text-base animate-professor-pop select-none">💢</span>
      )}
      {mood === 'happy' && (
        <span className="absolute top-1 -right-1 text-base animate-professor-pop select-none">✨</span>
      )}
    </div>
  )
}
