'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/supabase'
import { getDailyPlan, completeSession, CURRICULUM, type DailyPlan } from '@/lib/curriculum'

const SESSION_DURATION = 40 * 60 // 40 dəq saniyə ilə

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const TOLES_COLORS: Record<string, string> = {
  Foundation: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Higher: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Advanced: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

export default function DailySchedule() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [timers, setTimers] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    getUser().then(u => {
      if (u) {
        setUserId(u.id)
        getDailyPlan(u.id).then(p => {
          setPlan(p)
          setLoading(false)
        })
      }
    })
  }, [])

  // Timer yenilə
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !plan) {
    return (
      <div className="card mb-8 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-6" />
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3" />)}
      </div>
    )
  }

  const { day, curriculum, completedSessions, carryOver } = plan
  const topicParam = encodeURIComponent(curriculum.topics.join(','))
  const readingParam = curriculum.reading_id

  const SESSIONS = [
    {
      id: 'morning',
      emoji: '🌅',
      label: 'SRS Lüğət Kartları',
      desc: 'Gündəlik söz məşqi — SM-2 alqoritmi',
      route: '/vocabulary',
    },
    {
      id: 'midday',
      emoji: '☀️',
      label: 'TOLES Oxu Anlama',
      desc: `"${curriculum.title_en}" mətni + kollokasiya`,
      route: `/reading?passageId=${readingParam}&topics=${topicParam}`,
    },
    {
      id: 'evening',
      emoji: '🌆',
      label: 'Output: Quiz / Yazma',
      desc: `${curriculum.title} mövzusunda quiz + yazma`,
      route: `/output?topics=${topicParam}`,
    },
    {
      id: 'night',
      emoji: '🌙',
      label: 'TOLES Mock Mini-Test',
      desc: `${curriculum.title} sualları — lüğət + qrammatika + kollokasiya`,
      route: `/mock-test?topics=${topicParam}`,
    },
  ]

  const completedCount = SESSIONS.filter(s => completedSessions.includes(s.id)).length

  async function handleStart(session: typeof SESSIONS[0]) {
    if (!userId) return
    // Timer başlat
    setTimers(prev => ({ ...prev, [session.id]: Date.now() }))
    // Session-u tamamlandı kimi qeyd et (40 dəq sonra — amma açılarkən də qeyd edək)
    await completeSession(userId, session.id)
    setPlan(prev => prev ? {
      ...prev,
      completedSessions: [...prev.completedSessions.filter(s => s !== session.id), session.id]
    } : prev)
    router.push(session.route)
  }

  const getStatus = (id: string) => {
    if (completedSessions.includes(id)) return 'done'
    if (timers[id]) return 'active'
    return 'idle'
  }

  const getRemaining = (id: string) => {
    if (!timers[id]) return SESSION_DURATION
    return Math.max(0, SESSION_DURATION - Math.floor((Date.now() - timers[id]) / 1000))
  }

  return (
    <div className="card mb-8">
      {/* Başlıq: Gün + Mövzu */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Gün {day}</span>
            <span className="text-gray-400 text-sm">/ {CURRICULUM.length}</span>
            {curriculum.is_exam && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-medium">🎓 İmtahan</span>}
            {curriculum.is_review && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium">🔄 Təkrar</span>}
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{curriculum.title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{curriculum.focus}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${TOLES_COLORS[curriculum.toles_level]}`}>
          TOLES {curriculum.toles_level}
        </span>
      </div>

      {/* Ümumi irəliləyiş (30 gün) */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>TOLES irəliləyişi</span>
          <span>{day}/{CURRICULUM.length} gün</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${(day / CURRICULUM.length) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>Foundation</span><span>Higher</span><span>Advanced</span>
        </div>
      </div>

      {/* Keçmiş günün yarımçıq sessionları */}
      {carryOver.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
          ⏳ Dünən tamamlanmayan: <strong>{carryOver.join(', ')}</strong> — bu gün əvvəl tamamla.
        </div>
      )}

      {/* Gün sessiyaları */}
      <div className="space-y-3 mb-5">
        {SESSIONS.map(session => {
          const status = getStatus(session.id)
          const remaining = getRemaining(session.id)
          const isCarryOver = carryOver.includes(session.id)
          const progress = status === 'active' ? ((SESSION_DURATION - remaining) / SESSION_DURATION) * 100 : status === 'done' ? 100 : 0

          return (
            <div key={session.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                status === 'done' ? 'border-green-400 bg-green-50 dark:bg-green-950'
                : status === 'active' ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                : isCarryOver ? 'border-amber-300 dark:border-amber-700'
                : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{session.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {session.label} {status === 'done' && '✓'}
                    </span>
                    {status === 'idle' && (
                      <button onClick={() => handleStart(session)}
                        className={`shrink-0 px-3 py-1 text-white text-xs font-medium rounded-lg transition-colors ${
                          isCarryOver ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                        }`}>
                        Başla →
                      </button>
                    )}
                    {status === 'active' && (
                      <button onClick={() => router.push(session.route)}
                        className="shrink-0 flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-lg font-mono">
                        {formatTime(remaining)} →
                      </button>
                    )}
                    {status === 'done' && (
                      <span className="text-xs text-green-600 dark:text-green-400 shrink-0">40 dəq ✓</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{session.desc}</p>
                  {status === 'active' && (
                    <div className="mt-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1">
                      <div className="bg-blue-500 h-1 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Günlük progress */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Bu günkü sessiyalar</span>
        <span>{completedCount}/4 tamamlandı</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(completedCount / 4) * 100}%` }} />
      </div>

      {/* Növbəti gün hint */}
      {completedCount === 4 && day < CURRICULUM.length && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-800 dark:text-green-200">
          🎉 Bu günü tamamladın! Sabah: <strong>Gün {day + 1} — {CURRICULUM[day].title}</strong>
        </div>
      )}
      {day === CURRICULUM.length && completedCount === 4 && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-800 dark:text-purple-200 font-medium text-center">
          🎓 30 günlük TOLES proqramını tamamladın! TOLES imtahanına hazırsan!
        </div>
      )}
    </div>
  )
}
