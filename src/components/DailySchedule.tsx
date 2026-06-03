'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/supabase'
import { getDailyPlan, completeSession, CURRICULUM, type DailyPlan } from '@/lib/curriculum'

const DURATION = 40 * 60 // 40 dəq = 2400 saniyə
const TIMER_KEY = 'be_session_timers'
const TOLES_COLORS: Record<string, string> = {
  Foundation: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Higher:     'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Advanced:   'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

// localStorage-dan bu günün timer-larını oxu
function loadTimers(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    return parsed[today] ?? {}
  } catch { return {} }
}

function saveTimers(timers: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    const today = new Date().toISOString().slice(0, 10)
    const existing = JSON.parse(localStorage.getItem(TIMER_KEY) ?? '{}')
    existing[today] = timers
    localStorage.setItem(TIMER_KEY, JSON.stringify(existing))
  } catch {}
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

// Saniyə → faiz (0-100)
function elapsedPct(startedAt: number | undefined): number {
  if (!startedAt) return 0
  const elapsed = (Date.now() - startedAt) / 1000
  return Math.min(100, Math.round((elapsed / DURATION) * 100))
}

// Saniyə qalan
function remaining(startedAt: number | undefined): number {
  if (!startedAt) return DURATION
  return Math.max(0, DURATION - Math.floor((Date.now() - startedAt) / 1000))
}

export default function DailySchedule() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [timers, setTimers] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)
  // hangi sessionların Supabase-ə yazıldığını izlə (2 dəfə yazmasın)
  const [savedSessions, setSavedSessions] = useState<Set<string>>(new Set())

  useEffect(() => {
    setTimers(loadTimers())
    getUser().then(u => {
      if (u) {
        setUserId(u.id)
        getDailyPlan(u.id).then(p => {
          setPlan(p)
          setSavedSessions(new Set(p.completedSessions))
          setLoading(false)
        })
      }
    })
  }, [])

  // Hər saniyə yenilə + tamamlanan session-ları Supabase-ə yaz
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
      if (!userId || !plan) return

      const current = loadTimers()
      const SESSIONS = ['morning', 'midday', 'evening', 'night']
      SESSIONS.forEach(sid => {
        const pct = elapsedPct(current[sid])
        if (pct >= 100 && !savedSessions.has(sid)) {
          // 40 dəq tamam — Supabase-ə yaz
          completeSession(userId, sid).then(() => {
            setSavedSessions(prev => new Set([...prev, sid]))
            setPlan(prev => prev ? {
              ...prev,
              completedSessions: [...prev.completedSessions.filter(s => s !== sid), sid]
            } : prev)
          })
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [userId, plan, savedSessions])

  if (loading || !plan) {
    return (
      <div className="card mb-8 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-6" />
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3" />)}
      </div>
    )
  }

  const { day, curriculum, carryOver } = plan
  const topicParam = encodeURIComponent(curriculum.topics.join(','))

  const SESSIONS = [
    { id: 'morning', emoji: '🌅', label: 'SRS Lüğət Kartları',  desc: 'Gündəlik söz məşqi — SM-2 alqoritmi',               route: '/vocabulary' },
    { id: 'midday',  emoji: '☀️', label: 'TOLES Oxu Anlama',     desc: `"${curriculum.title_en}" mətni + kollokasiya`,       route: `/reading?passageId=${curriculum.reading_id}&topics=${topicParam}` },
    { id: 'evening', emoji: '🌆', label: 'Output: Quiz / Yazma', desc: `${curriculum.title} mövzusunda quiz + yazma`,         route: `/output?topics=${topicParam}` },
    { id: 'night',   emoji: '🌙', label: 'TOLES Mock Mini-Test', desc: `${curriculum.title} sualları — lüğət + qrammatika`, route: `/mock-test?topics=${topicParam}` },
  ]

  // Hər session üçün faiz
  const sessionPct = (id: string) => elapsedPct(timers[id])
  const isDone = (id: string) => sessionPct(id) >= 100 || savedSessions.has(id)

  // Günlük ümumi faiz = 4 session-un ortası
  const dailyPct = Math.round(
    SESSIONS.reduce((sum, s) => sum + (isDone(s.id) ? 100 : sessionPct(s.id)), 0) / SESSIONS.length
  )

  function handleStart(session: typeof SESSIONS[0]) {
    if (isDone(session.id)) {
      router.push(session.route)
      return
    }
    // Timer başlat (əgər başlanmayıbsa)
    if (!timers[session.id]) {
      const next = { ...timers, [session.id]: Date.now() }
      setTimers(next)
      saveTimers(next)
    }
    router.push(session.route)
  }

  return (
    <div className="card mb-8">

      {/* Başlıq */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xl font-bold text-gray-900 dark:text-white">Gün {day}</span>
            <span className="text-gray-400 text-sm">/ {CURRICULUM.length}</span>
            {curriculum.is_exam   && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-medium">🎓 İmtahan</span>}
            {curriculum.is_review && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium">🔄 Təkrar</span>}
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{curriculum.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{curriculum.focus}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${TOLES_COLORS[curriculum.toles_level]}`}>
          TOLES {curriculum.toles_level}
        </span>
      </div>

      {/* TOLES ümumi irəliləyiş (30 gün) */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>TOLES irəliləyişi</span>
          <span>{day}/30 gün</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 h-1.5 rounded-full transition-all"
               style={{ width: `${(day / CURRICULUM.length) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>Foundation</span><span>Higher</span><span>Advanced</span>
        </div>
      </div>

      {/* Keçilməmiş session xəbərdarlığı */}
      {carryOver.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
          ⏳ Dünən tamamlanmayan: <strong>{carryOver.length} sessiya</strong> — əvvəl bunları tamamla.
        </div>
      )}

      {/* Sessiyalar */}
      <div className="space-y-3 mb-5">
        {SESSIONS.map(session => {
          const done = isDone(session.id)
          const started = !!timers[session.id] && !done
          const pct = done ? 100 : sessionPct(session.id)
          const rem = remaining(timers[session.id])

          return (
            <div key={session.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                done    ? 'border-green-400 bg-green-50 dark:bg-green-950'
                : started ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{session.emoji}</span>
                <div className="flex-1 min-w-0">

                  {/* Ad + Faiz + Düymə */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {session.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Faiz göstərici */}
                      <span className={`text-xs font-bold ${
                        done ? 'text-green-600' : started ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {pct}%
                      </span>
                      {/* Düymə */}
                      {done ? (
                        <button onClick={() => router.push(session.route)}
                          className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Yenidən ↗
                        </button>
                      ) : started ? (
                        <button onClick={() => router.push(session.route)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg font-mono">
                          {formatTime(rem)}
                        </button>
                      ) : (
                        <button onClick={() => handleStart(session)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg">
                          Başla →
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{session.desc}</p>

                  {/* Session progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-1000 ${
                        done ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Günlük ümumi faiz */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Bu günkü sessiyalar</span>
          <span className={`text-sm font-bold ${
            dailyPct >= 100 ? 'text-green-600'
            : dailyPct >= 50 ? 'text-blue-600'
            : 'text-gray-500'
          }`}>{dailyPct}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ${
              dailyPct >= 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${dailyPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Hər sessiya 40 dəq tamamlandıqda 25% qazanılır (cəmi 100%)
        </p>
      </div>

      {/* Tamamlandı mesajı */}
      {dailyPct >= 100 && day < CURRICULUM.length && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-800 dark:text-green-200">
          🎉 Əla! Bu günü tamamladın! Sabah: <strong>Gün {day + 1} — {CURRICULUM[day]?.title}</strong>
        </div>
      )}
      {day === CURRICULUM.length && dailyPct >= 100 && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-800 dark:text-purple-200 font-medium text-center">
          🎓 30 günlük TOLES proqramını tamamladın! TOLES imtahanına hazırsan!
        </div>
      )}
    </div>
  )
}
