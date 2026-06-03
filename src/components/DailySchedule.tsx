'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SessionSlot {
  id: string
  emoji: string
  time: string
  activity: string
  duration: string
  focus: string
  completed: boolean
}

interface DailyScheduleProps {
  completedSessions?: string[]
  onSessionClick?: (sessionId: string) => void
}

export default function DailySchedule({ completedSessions = [], onSessionClick }: DailyScheduleProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSlot[]>([
    {
      id: 'morning',
      emoji: '🌅',
      time: '7:00–8:00',
      activity: 'SRS Lüğət Kartları',
      duration: '10–15 dəq',
      focus: 'Səhər kortizolu öyrənməni gücləndirir',
      completed: false,
    },
    {
      id: 'midday',
      emoji: '☀️',
      time: '12:00–13:00',
      activity: 'İ+1 Oxuma / Dinləmə',
      duration: '15–20 dəq',
      focus: 'Lunch vaxtı — beyin aktiv, stres azdır',
      completed: false,
    },
    {
      id: 'evening',
      emoji: '🌆',
      time: '18:00–19:00',
      activity: 'Output: Quiz/Yazma',
      duration: '10–15 dəq',
      focus: 'Gündüzki inputu "işləyib çıxarır"',
      completed: false,
    },
    {
      id: 'night',
      emoji: '🌙',
      time: '22:30–23:00',
      activity: 'Qısa Review (SRS)',
      duration: '5 dəq',
      focus: 'Yuxu konsolidasiyasını aktivləşdirir',
      completed: false,
    },
  ])

  // Completed sessions-ı işarələ
  useEffect(() => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        completed: completedSessions.includes(s.id),
      }))
    )
  }, [completedSessions])

  const completedCount = sessions.filter((s) => s.completed).length
  const totalMinutes = sessions.reduce((sum, s) => {
    const match = s.duration.match(/(\d+)/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0)

  return (
    <div className="card">
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📅 Günlük Plan — İdeal 45-55 dəq</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">
              {completedCount}/{sessions.length} sessiya tamamlandı
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-400">
              {totalMinutes} dəq/gün
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(completedCount / sessions.length) * 100}%` }}
        ></div>
      </div>

      {/* Sessiyalar */}
      <div className="space-y-3">
        {sessions.map((session) => {
          const routeMap: Record<string, string> = {
            morning: '/vocabulary',
            midday: '/lessons',
            evening: '/quiz',
            night: '/vocabulary',
          }
          const route = routeMap[session.id] || '/vocabulary'
          return (
          <button
            key={session.id}
            onClick={() => {
              onSessionClick?.(session.id)
              router.push(route)
            }}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              session.completed
                ? 'border-green-400 bg-green-50 dark:bg-green-950'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{session.emoji}</span>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {session.activity}
                  {session.completed && <span className="text-green-600">✓</span>}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {session.time} • {session.duration}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                  {session.focus}
                </div>
              </div>
            </div>
          </button>
          )
        })}
      </div>

      {/* Məsləhət */}
      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          💡 <strong>Konsistensiya = İntensivlik</strong>: Gündə 45 dəq mütəmadi, həftədə 1 dəfə 5 saatdan daha effektivdir.
          (Bahrick et al. 1993)
        </p>
      </div>
    </div>
  )
}
