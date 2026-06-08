'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getUser, getUserProfile, getDueCards, getWeeklyStats } from '@/lib/supabase'
import { LEVEL_COLORS, TOLES_COLORS, formatNumber } from '@/lib/utils'
import { getTOLESProgress, TOLES_LEVELS } from '@/lib/toles'
import { PROFICIENCY_HOURS, TOTAL_PATHWAY } from '@/lib/hours'
import DailySchedule from '@/components/DailySchedule'
import WeakPoints from '@/components/WeakPoints'
import AITutorChat from '@/components/AITutorChat'
import type { UserProfile } from '@/types'
import lessonsData from '@/data/lessons.json'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [weeklyData, setWeeklyData] = useState<{ day: string; correct: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await getUserProfile(user.id)
      if (prof) setProfile(prof as UserProfile)

      const { data: due } = await getDueCards(user.id, 100)
      setDueCount(due?.length ?? 0)

      const { data: quiz } = await getWeeklyStats(user.id)
      if (quiz) {
        const grouped: Record<string, number> = {}
        quiz.forEach((r: { correct: boolean; answered_at: string }) => {
          const day = new Date(r.answered_at).toLocaleDateString('az-AZ', { weekday: 'short' })
          grouped[day] = (grouped[day] ?? 0) + (r.correct ? 1 : 0)
        })
        setWeeklyData(Object.entries(grouped).map(([day, correct]) => ({ day, correct })))
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Yüklənir...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-bold text-blue-600 text-lg">Best English</span>
          <div className="flex items-center gap-3">
            {profile && (
              <>
                <span className={`badge ${LEVEL_COLORS[profile.level as keyof typeof LEVEL_COLORS]}`}>
                  {profile.level}
                </span>
                <span className={`badge ${TOLES_COLORS[profile.toles_level as keyof typeof TOLES_COLORS]}`}>
                  TOLES {profile.toles_level}
                </span>
              </>
            )}
            <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">
              Çıxış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stat kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Ardıcıl Gün', value: `🔥 ${profile?.streak ?? 0}`, color: 'text-orange-600' },
            { label: 'Bu Gün Review', value: dueCount.toString(), color: dueCount > 0 ? 'text-blue-600' : 'text-green-600' },
            { label: 'Ümumi Xal', value: formatNumber(profile?.total_points ?? 0), color: 'text-purple-600' },
            { label: 'Səviyyə', value: profile?.level ?? '—', color: 'text-gray-900' },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* TOLES Xəritəsi */}
        {profile && (
          <div className="card mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-200 dark:border-purple-800">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              🎓 TOLES Sertifikat Yolu
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {['Foundation', 'Higher', 'Advanced'].map((level, idx) => {
                const levelInfo = TOLES_LEVELS[level as keyof typeof TOLES_LEVELS];
                const isActive = profile.toles_level === level;
                const isPassed = ['Foundation', 'Higher', 'Advanced'].indexOf(profile.toles_level) >= idx;

                return (
                  <div
                    key={level}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-purple-500 bg-white dark:bg-purple-900'
                        : isPassed
                          ? 'border-green-400 bg-green-50 dark:bg-green-950'
                          : 'border-gray-300 dark:border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {isActive && '→ '}
                      {level}
                      {isPassed && !isActive && ' ✓'}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{levelInfo.cefr}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{levelInfo.hours}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Zəif Nöqtə Drilleri */}
        <WeakPoints />

        {/* Günlük Plan — Hissə 5 */}
        <DailySchedule />

        {/* Həftəlik qrafik */}
        {weeklyData.length > 0 && (
          <div className="card mb-8">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              📈 Bu Həftə — Düzgün Cavablar
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="correct" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Vaxt Roadmap — Hissə 4 */}
        <div className="card mb-8 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">⏱️ Vaxt Roadmap (FSI Data)</h2>
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            <p className="mb-3">
              <strong>Gündə 45 dəq istifadə ilə:</strong>
            </p>
            <div className="space-y-2">
              {PROFICIENCY_HOURS.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs bg-white dark:bg-indigo-900 p-2 rounded">
                  <span>{item.from} → {item.to}</span>
                  <span className="font-medium">{item.months_2h} ay ({item.hours}h)</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded text-sm text-indigo-900 dark:text-indigo-100">
            <strong>Sıfırdan C1-ə:</strong> {TOTAL_PATHWAY.sifir_to_c1.months_2h} (gündə 2 saat)
          </div>
        </div>

        {/* Navigasiya kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              href: '/vocabulary',
              icon: '🗂️',
              title: 'Lüğət (SRS)',
              desc: dueCount > 0 ? `${dueCount} kart bu gün review üçün hazırdır` : 'Bütün kartlar öyrənildi ✓',
              cta: dueCount > 0 ? 'Başla →' : 'Yeni söz əlavə et',
              urgent: dueCount > 0,
            },
            {
              href: '/memory-lab',
              icon: '🧪',
              title: 'Yaddaş Laboratoriyası',
              desc: '9 elmi yaddaş üsulunu (mnemonika, vizual təsvir, etimologiya...) bir sözdə birləşdir — könüllü, ayrı məşq',
              cta: 'Dərinə get →',
              urgent: false,
            },
            {
              href: '/quiz',
              icon: '✍️',
              title: 'Testlər',
              desc: 'Foundation / Higher / Advanced səviyyəsindən sual həll et',
              cta: 'Testi Başla →',
              urgent: false,
            },
            {
              href: '/friends',
              icon: '👥',
              title: 'Dostlar & Yarış',
              desc: 'Email ilə dost tap, dostluq qur və TOLES Mini-Test yarışında canlı yarış!',
              cta: 'Dostlara bax →',
              urgent: false,
            },
            {
              href: '/lessons',
              icon: '📖',
              title: 'Dərslər',
              desc: `${lessonsData.length} mini-dərs: müqavilə, məhkəmə, əmək, tort hüququ...`,
              cta: 'Dərslərə bax →',
              urgent: false,
            },
            {
              href: '/placement',
              icon: '📊',
              title: 'Səviyyə Testi',
              desc: 'İngilis dili səviyyəni (A1–C2) yenidən ölç — 18 sual, ~3 dəqiqə',
              cta: 'Testi Başla →',
              urgent: false,
            },
            {
              href: '/change-level',
              icon: '⚙️',
              title: 'Səviyyəni Dəyiş',
              desc: `Cari: ${profile?.level} (TOLES: ${profile?.toles_level}) — əl ilə dəyiş`,
              cta: 'Dəyiş →',
              urgent: false,
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`card hover:shadow-md transition-shadow cursor-pointer block ${
                item.urgent ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950' : ''
              }`}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.desc}</p>
              <span className="text-sm font-medium text-blue-600">{item.cta}</span>
            </Link>
          ))}
        </div>
      </main>
      <AITutorChat level={profile?.level ?? 'B1'} />
    </div>
  )
}
