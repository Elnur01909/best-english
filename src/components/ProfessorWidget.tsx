'use client'
import { useEffect, useState } from 'react'
import ProfessorAvatar, { type ProfessorMood } from './ProfessorAvatar'

/**
 * Saytın üzərində üzən, müstəqil interaktiv professor personajı.
 * Səhifə məzmununun İÇİNDƏ deyil — guşədə üzür, reaksiyasını köpük (bubble) ilə göstərir.
 */
export default function ProfessorWidget({
  mood = 'neutral',
  message = null,
}: {
  mood?: ProfessorMood
  message?: string | null
}) {
  const [visible, setVisible] = useState(false)

  const bubbleText = mood === 'thinking' ? (message ?? 'Hmm... düşünürəm 🤔') : message

  useEffect(() => {
    if (mood === 'neutral') {
      setVisible(false)
      return
    }
    if (mood === 'thinking') {
      setVisible(true)
      return
    }
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4200)
    return () => clearTimeout(t)
  }, [mood, message])

  return (
    <div className="fixed bottom-2 left-2 sm:bottom-4 sm:left-4 z-40 flex items-end gap-2 pointer-events-none select-none">
      <div className={`transition-all duration-300 ${mood === 'neutral' ? 'animate-professor-idle' : ''}`}>
        <ProfessorAvatar mood={mood} size={92} />
      </div>

      {visible && bubbleText && (
        <div
          className={`mb-3 max-w-[200px] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs font-medium shadow-lg animate-professor-bubble ${
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
    </div>
  )
}
