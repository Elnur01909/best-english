'use client'
import { useEffect, useState } from 'react'
import ProfessorAvatar, { type ProfessorMood } from './ProfessorAvatar'

/**
 * Sualın yanında dayanan, müstəqil interaktiv professor personajı.
 * Reaksiyasını (sevinc/əsəb/düşüncə) canlı animasiya və köpük (bubble) ilə göstərir.
 */
export default function ProfessorWidget({
  mood = 'neutral',
  message = null,
  className = '',
}: {
  mood?: ProfessorMood
  message?: string | null
  className?: string
}) {
  const [visible, setVisible] = useState(false)

  const bubbleText = mood === 'thinking' ? (message ?? 'Hmm... düşünürəm 🤔') : message

  // Köpük əhval-ruhiyyə neytrala dönənədək (yəni növbəti suala keçənədək) görünür qalır
  useEffect(() => {
    setVisible(mood !== 'neutral')
  }, [mood, message])

  return (
    <div className={`flex flex-col items-center gap-1.5 shrink-0 pointer-events-none select-none ${className}`}>
      {visible && bubbleText && (
        <div
          className={`max-w-[220px] rounded-2xl px-3 py-2 text-[11px] leading-snug text-center font-medium shadow-lg animate-professor-bubble ${
            mood === 'happy'
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
              : mood === 'thinking'
              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
          }`}
        >
          {bubbleText}
        </div>
      )}
      <div className={`transition-all duration-300 ${mood === 'neutral' ? 'animate-professor-idle' : ''}`}>
        <ProfessorAvatar mood={mood} size={68} />
      </div>
    </div>
  )
}
