'use client'

export type ProfessorMood = 'neutral' | 'happy' | 'disappointed' | 'thinking'

const MOOD_ANIMATION: Record<ProfessorMood, string> = {
  neutral: 'animate-professor-breathe',
  happy: 'animate-professor-laugh',
  disappointed: 'animate-professor-sigh',
  thinking: 'animate-professor-think',
}

// Bədən proporsiyası: viewBox 100 (en) x 124 (hündürlük) — "mascot" tipli, isti illüstrasiya
const ASPECT = 1.24

let uid = 0

/**
 * Virtual professor persona — illüstrasiya tərzində, canlı mimikalı müəllim.
 * Düzgün cavabda gülümsəyir/sevinir, səhv cavabda qəzəblənmir — sadəcə məyus olur,
 * uzun fasilədə isə düşüncəyə dalır.
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
        ) : mood === 'disappointed' ? (
          <>
            {/* çiyinləri düşmüş, qollar süst halda aşağı sallanıb */}
            <path d="M31 79 Q22 92 26 108" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="26" cy="108" r="7" fill={`url(#${skinGrad})`} />
            <path d="M69 79 Q78 92 74 108" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="74" cy="108" r="7" fill={`url(#${skinGrad})`} />
          </>
        ) : mood === 'thinking' ? (
          <>
            {/* sağ qol — çənəyə dayanıb düşünür */}
            <path d="M70 78 Q80 64 64 53" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="63" cy="53" r="7" fill={`url(#${skinGrad})`} />
            {/* sol qol aşağı */}
            <path d="M30 78 Q19 96 28 110" stroke={`url(#${robeGrad})`} strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="28" cy="110" r="7" fill={`url(#${skinGrad})`} />
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
        {/* üzdə təbii kölgələmə — sağ tərəf bir az tündləşir, sol tərəfdə işıq vurur */}
        <path d="M50 12 A30 30 0 0 1 50 72 A34 34 0 0 0 50 12 Z" fill="#e8a76e" opacity="0.16" />
        <ellipse cx="40" cy="32" rx="11" ry="8" fill="#fff" opacity="0.2" />

        {/* yanaq allığı */}
        <ellipse cx="32" cy="49" rx="5.5" ry="3.5" fill="#ff9d8a" opacity="0.45" />
        <ellipse cx="68" cy="49" rx="5.5" ry="3.5" fill="#ff9d8a" opacity="0.45" />

        {/* qaşlar */}
        {mood === 'disappointed' ? (
          <>
            <path d="M33 31 Q40 35.5 46 35" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M67 31 Q60 35.5 54 35" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'thinking' ? (
          <>
            <path d="M33 32 Q39.5 29 46 31" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M54 34 Q60.5 31.5 67 35" stroke="#7a7390" strokeWidth="3" fill="none" strokeLinecap="round" />
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
        ) : mood === 'disappointed' ? (
          <>
            {/* yarıyumulmuş, aşağı baxan kədərli gözlər + kirpik */}
            <path d="M33.5 45.5 Q37 47.5 40.5 45.5" stroke="#4a4360" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d="M59.5 45.5 Q63 47.5 66.5 45.5" stroke="#4a4360" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <ellipse cx="37" cy="46.5" rx="1.9" ry="2.1" fill="#4a4360" />
            <ellipse cx="63" cy="46.5" rx="1.9" ry="2.1" fill="#4a4360" />
            {/* kədər damlası */}
            <path d="M67.5 50 Q70 54 67.5 56.5 Q65 54 67.5 50 Z" fill="#8ec9f5" opacity="0.85" className="animate-professor-tear" />
          </>
        ) : mood === 'thinking' ? (
          <>
            <ellipse cx="37" cy="44" rx="2.4" ry="2.8" fill="#4a4360" />
            <ellipse cx="63" cy="44" rx="2.4" ry="2.8" fill="#4a4360" />
            <circle cx="37.8" cy="43.1" r="0.8" fill="#fff" opacity="0.85" />
            <circle cx="63.8" cy="43.1" r="0.8" fill="#fff" opacity="0.85" />
          </>
        ) : (
          <>
            <circle cx="37" cy="45" r="2.6" fill="#4a4360" />
            <circle cx="63" cy="45" r="2.6" fill="#4a4360" />
            <circle cx="37.9" cy="44" r="0.9" fill="#fff" opacity="0.9" />
            <circle cx="63.9" cy="44" r="0.9" fill="#fff" opacity="0.9" />
          </>
        )}

        {/* bığ */}
        <path d="M40 56 Q50 52 60 56 Q50 59.5 40 56 Z" fill="#a89fc2" />

        {/* ağız */}
        {mood === 'happy' ? (
          <path d="M41 62 Q50 70.5 59 62" stroke="#c1395a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        ) : mood === 'disappointed' ? (
          <path d="M43 65.5 Q50 60.5 57 65.5" stroke="#9c5b75" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        ) : mood === 'thinking' ? (
          <ellipse cx="49" cy="63" rx="3" ry="3.4" fill="#c1395a" opacity="0.75" />
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

      {mood === 'disappointed' && (
        <span className="absolute top-1 -right-1 text-base animate-professor-pop select-none">😔</span>
      )}
      {mood === 'happy' && (
        <span className="absolute top-1 -right-1 text-base animate-professor-pop select-none">✨</span>
      )}
      {mood === 'thinking' && (
        <span className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded-full bg-white/90 dark:bg-gray-800/90 shadow px-1.5 py-1 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-professor-think-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-professor-think-dot" style={{ animationDelay: '180ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-professor-think-dot" style={{ animationDelay: '360ms' }} />
        </span>
      )}
    </div>
  )
}
