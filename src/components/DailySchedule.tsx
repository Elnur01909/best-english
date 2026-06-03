'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: string
  emoji: string
  activity: string
  desc: string
  route: string
}

const SESSIONS: Session[] = [
  {
    id: 'morning',
    emoji: '🌅',
    activity: 'SRS Lüğət Kartları',
    desc: 'Səhər kortizolu öyrənməni gücləndirir',
    route: '/vocabulary',
  },
  {
    id: 'midday',
    emoji: '☀️',
    activity: 'İ+1 Oxuma / Dərslər',
    desc: 'Beyin aktiv olduğu vaxt — input',
    route: '/lessons',
  },
  {
    id: 'evening',
    emoji: '🌆',
    activity: 'Output: Quiz / Yazma',
    desc: 'Gündüzki inputu "işləyib çıxarır"',
    route: '/quiz',
  },
  {
    id: 'night',
    emoji: '🌙',
    activity: 'Qısa Review (SRS)',
    desc: 'Yuxu konsolidasiyasını aktivləşdirir',
    route: '/vocabulary',
  },
]

const SESSION_DURATION = 40 * 60 // 40 dəqiqə (saniyə)
const STORAGE_KEY = 'be_daily_sessions'

interface SessionState {
  startedAt: number | null  // timestamp
  completed: boolean
}

type StorageData = Record<string, SessionState>

function getTodayKey() {
  return new Date().toISOString().slice(0, 10) // "2026-06-03"
}

function loadStorage(): StorageData {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Bugünkü datanı al, köhnəni at
    return parsed[getTodayKey()] ?? {}
  } catch {
    return {}
  }
}

function saveStorage(data: StorageData) {
  if (typeof window === 'undefined') return
  try {
    const today = getTodayKey()
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    existing[today] = data
    // Köhnə günləri sil (son 7 gün saxla)
    const keys = Object.keys(existing).sort()
    if (keys.length > 7) delete existing[keys[0]]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {}
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function DailySchedule() {
  const router = useRouter()
  const [states, setStates] = useState<StorageData>({})
  const [tick, setTick] = useState(0) // hər saniyə yenilə

  // Yüklə
  useEffect(() => {
    setStates(loadStorage())
  }, [])

  // Hər saniyə yenilə (timer üçün) + tamamlanmış sessionları yoxla
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)

      // Vaxtı dolmuş sessionları tamamla
      setStates((prev) => {
        const now = Date.now()
        let changed = false
        const next = { ...prev }
        for (const id of Object.keys(next)) {
          const s = next[id]
          if (s.startedAt && !s.completed) {
            const elapsed = (now - s.startedAt) / 1000
            if (elapsed >= SESSION_DURATION) {
              next[id] = { ...s, completed: true }
              changed = true
            }
          }
        }
        if (changed) saveStorage(next)
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function startSession(session: Session) {
    // Artıq başlayıbsa yenidən başlatma
    const s = states[session.id]
    if (s?.completed) return

    const now = Date.now()
    const next: StorageData = {
      ...states,
      [session.id]: { startedAt: now, completed: false },
    }
    setStates(next)
    saveStorage(next)
    router.push(session.route)
  }

  function getRemainingSeconds(id: string): number {
    const s = states[id]
    if (!s?.startedAt || s.completed) return SESSION_DURATION
    const elapsed = (Date.now() - s.startedAt) / 1000
    return Math.max(0, SESSION_DURATION - elapsed)
  }

  function getStatus(id: string): 'idle' | 'active' | 'done' {
    const s = states[id]
    if (!s) return 'idle'
    if (s.completed) return 'done'
    if (s.startedAt) return 'active'
    return 'idle'
  }

  const completedCount = SESSIONS.filter((s) => getStatus(s.id) === 'done').length
  const totalDone = SESSIONS.filter((s) => getStatus(s.id) !== 'idle').length

  return (
    <div className="card mb-8">
      {/* Başlıq */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">📅 Günlük Plan</h3>
        <span className="text-sm text-gray-500">{completedCount}/{SESSIONS.length} tamamlandı</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / SESSIONS.length) * 100}%` }}
        />
      </div>

      {/* Sessiyalar */}
      <div className="space-y-3">
        {SESSIONS.map((session) => {
          const status = getStatus(session.id)
          const remaining = getRemainingSeconds(session.id)
          const progress = status === 'active'
            ? ((SESSION_DURATION - remaining) / SESSION_DURATION) * 100
            : status === 'done' ? 100 : 0

          return (
            <div
              key={session.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                status === 'done'
                  ? 'border-green-400 bg-green-50 dark:bg-green-950'
                  : status === 'active'
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{session.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {session.activity}
                      {status === 'done' && ' ✓'}
                    </span>

                    {/* Düymə / Timer */}
                    {status === 'idle' && (
                      <button
                        onClick={() => startSession(session)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Başla →
                      </button>
                    )}
                    {status === 'active' && (
                      <button
                        onClick={() => router.push(session.route)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg"
                      >
                        <span className="font-mono">{formatTime(Math.ceil(remaining))}</span>
                        <span>→</span>
                      </button>
                    )}
                    {status === 'done' && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">40 dəq ✓</span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{session.desc}</p>

                  {/* Active progress bar */}
                  {status === 'active' && (
                    <div className="mt-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Məsləhət */}
      <div className="mt-5 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          💡 Hər sessiya <strong>40 dəqiqə</strong> ərzindədir. "Başla" düyməsinə basınca geri sayım başlayır.
          Gündə 4 sessiya = <strong>2 saat 40 dəq</strong> — ardıcıllıq hər şeydir.
        </p>
      </div>
    </div>
  )
}
