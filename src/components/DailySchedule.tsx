'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/supabase'
import { getDailyPlan, completeSession, CURRICULUM, type DailyPlan } from '@/lib/curriculum'
import { getTodayScores } from '@/lib/sessionScore'

const TOLES_COLORS: Record<string, string> = {
  Foundation: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Higher:     'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Advanced:   'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

export default function DailySchedule() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading || !plan) {
    return (
      <div className="card mb-8 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-6" />
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3" />)}
      </div>
    )
  }

  const { day, curriculum, carryOver } = plan
  const topicParam = encodeURIComponent(curriculum.topics.join(','))

  const SESSIONS = [
    { id: 'midday',  emoji: '☀️', label: 'TOLES Oxu Anlama',     desc: `"${curriculum.title_en}" mətni — sözləri kontekstdə gör`,  route: `/reading?passageId=${curriculum.reading_id}&topics=${topicParam}` },
    { id: 'morning', emoji: '🌅', label: 'SRS Lüğət Kartları',  desc: 'Mətndəki terminləri öyrən — SM-2 + 4 review',               route: '/vocabulary' },
    { id: 'evening', emoji: '🌆', label: 'Output: Quiz',         desc: `${curriculum.title} mövzusunda quiz — öyrəndiklərini sına`, route: `/output?topics=${topicParam}` },
    { id: 'night',   emoji: '🌙', label: 'TOLES Mock Mini-Test', desc: `${curriculum.title} — lüğət + qrammatika + kollokasiya`,    route: `/mock-test?topics=${topicParam}` },
  ]

  const scores = getTodayScores()
  // Session yalnız localStorage-da real score varsa tamamlanmış sayılır
  const getScore = (id: string) => scores[id] ?? 0
  const isDone = (id: string) => getScore(id) > 0
  // Günlük faiz: hər session max 25%, session_score%-ə mütənasib
  const dailyPct = Math.round(
    SESSIONS.reduce((sum, s) => sum + (getScore(s.id) * 25) / 100, 0)
  )

  function handleStart(session: typeof SESSIONS[0]) {
    // Yalnız navigate et — score hər səhifənin özü bitəndə yazır
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

      {/* 30 günlük TOLES irəliləyişi */}
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
        {SESSIONS.map((session, idx) => {
          const done = isDone(session.id)
          const sessionPct = getScore(session.id)

          return (
            <div key={session.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                done ? 'border-green-400 bg-green-50 dark:bg-green-950'
                     : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{session.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {session.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${done ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {sessionPct}%
                      </span>
                      {sessionPct >= 100 ? (
                        <button onClick={() => router.push(session.route)}
                          className="text-xs text-green-600 dark:text-green-400 font-medium hover:underline">
                          Yenidən ↗
                        </button>
                      ) : sessionPct > 0 ? (
                        <button onClick={() => router.push(session.route)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
                          Davam et →
                        </button>
                      ) : (
                        <button onClick={() => handleStart(session)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                          Başla →
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{session.desc}</p>
                  {/* Session progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div className={`h-1 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-gray-300'}`}
                      style={{ width: `${sessionPct}%` }} />
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
            dailyPct >= 100 ? 'text-green-600' : dailyPct > 0 ? 'text-blue-600' : 'text-gray-400'
          }`}>{dailyPct}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${dailyPct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
               style={{ width: `${dailyPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          {SESSIONS.map(s => (
            <span key={s.id} className={isDone(s.id) ? 'text-green-500 font-medium' : ''}>
              {isDone(s.id) ? '✓ 25%' : '○ 25%'}
            </span>
          ))}
        </div>
      </div>

      {/* Tamamlandı mesajı */}
      {dailyPct >= 100 && day < CURRICULUM.length && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-800 dark:text-green-200">
          🎉 Bu günü tamamladın! Sabah: <strong>Gün {day + 1} — {CURRICULUM[day]?.title}</strong>
        </div>
      )}
      {day === CURRICULUM.length && dailyPct >= 100 && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl text-sm font-medium text-center text-purple-800 dark:text-purple-200">
          🎓 30 günlük TOLES proqramını tamamladın!
        </div>
      )}
    </div>
  )
}
