'use client'

export type ProfessorMood = 'neutral' | 'happy' | 'annoyed'

const MOOD_ANIMATION: Record<ProfessorMood, string> = {
  neutral: '',
  happy: 'animate-professor-laugh',
  annoyed: 'animate-professor-shake',
}

/**
 * Virtual professor persona — qrafik müəllim personajı.
 * Düzgün cavabda gülür/sevinir, səhv cavabda əsəbiləşir.
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
  return (
    <div
      className={`relative inline-block shrink-0 ${MOOD_ANIMATION[mood]} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
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
      </svg>

      {mood === 'annoyed' && (
        <span className="absolute -top-1 -right-2 text-lg animate-professor-pop select-none">💢</span>
      )}
      {mood === 'happy' && (
        <span className="absolute -top-1 -right-2 text-lg animate-professor-pop select-none">✨</span>
      )}
    </div>
  )
}
