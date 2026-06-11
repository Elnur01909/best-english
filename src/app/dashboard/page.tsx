'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getUser, getUserProfile, getDueCards, updateProfile } from '@/lib/supabase'
import { LEVEL_COLORS, TOLES_COLORS } from '@/lib/utils'
import { getTOLESProgress, TOLES_LEVELS } from '@/lib/toles'
import DailySchedule from '@/components/DailySchedule'
import WeakPoints from '@/components/WeakPoints'
import CEFRLadder from '@/components/CEFRLadder'
import AITutorChat from '@/components/AITutorChat'
import type { UserProfile } from '@/types'
import lessonsData from '@/data/lessons.json'

const NAV_ITEMS = (dueCount: number, level: string, tolesLevel: string) => [
  {
    href: '/vocabulary',
    emoji: '🗂️',
    iconBg: '#e0e7ff',
    title: 'Lüğət (SRS)',
    desc: dueCount > 0 ? `${dueCount} kart bu gün review üçün hazırdır` : 'Bütün kartlar öyrənildi ✓',
    cta: dueCount > 0 ? 'Davam et' : 'Yeni söz öyrən',
    urgent: dueCount > 0,
  },
  {
    href: '/quiz',
    emoji: '✍️',
    iconBg: '#fef3c7',
    title: 'Testlər',
    desc: 'Foundation / Higher / Advanced səviyyəsindən sual həll et',
    cta: 'Testi Başla',
    urgent: false,
  },
  {
    href: '/lessons',
    emoji: '📖',
    iconBg: '#d1fae5',
    title: 'Dərslər',
    desc: `${lessonsData.length} mini-dərs: müqavilə, məhkəmə, əmək, tort hüququ...`,
    cta: 'Dərslərə bax',
    urgent: false,
  },
  {
    href: '/memory-lab',
    emoji: '🧪',
    iconBg: '#fce7f3',
    title: 'Yaddaş Laboratoriyası',
    desc: '9 elmi yaddaş üsulunu bir sözdə birləşdir',
    cta: 'Dərinə get',
    urgent: false,
  },
  {
    href: '/friends',
    emoji: '👥',
    iconBg: '#e0f2fe',
    title: 'Dostlar & Yarış',
    desc: 'Email ilə dost tap, canlı TOLES Mini-Test yarışında rəqabət et',
    cta: 'Dostlara bax',
    urgent: false,
  },
  {
    href: '/placement',
    emoji: '📊',
    iconBg: '#f5f3ff',
    title: 'Səviyyə Testi',
    desc: 'İngilis dili səviyyəni (A1–C2) yenidən ölç — 18 sual, ~3 dəq',
    cta: 'Testi Başla',
    urgent: false,
  },
]

const TOLES_STEP = [
  { key: 'Foundation', label: 'Foundation', cefr: 'B1–B2', color: '#10b981' },
  { key: 'Higher',     label: 'Higher',     cefr: 'C1',    color: '#6366f1' },
  { key: 'Advanced',   label: 'Advanced',   cefr: 'C2',    color: '#f59e0b' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  // Adı olmayan (köhnə) istifadəçilər üçün ad-soyad formu
  const [nameFirst, setNameFirst] = useState('')
  const [nameLast, setNameLast] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await getUserProfile(user.id)
      if (prof) setProfile(prof as UserProfile)

      const { data: due } = await getDueCards(user.id, 100)
      setDueCount(due?.length ?? 0)

      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    const displayName = `${nameFirst.trim()} ${nameLast.trim()}`.trim()
    if (!displayName) return
    setNameSaving(true)
    const { error } = await updateProfile(profile.id, { display_name: displayName })
    setNameSaving(false)
    if (!error) setProfile({ ...profile, display_name: displayName })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Yüklənir...</p>
        </div>
      </div>
    )
  }

  const tolesIdx = TOLES_STEP.findIndex(s => s.key === profile?.toles_level)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              BE
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text-1)' }}>
              Best English
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {profile && (
              <>
                <span className="badge-brand hidden sm:inline-flex">{profile.level}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold hidden sm:inline-flex"
                      style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                  TOLES {profile.toles_level}
                </span>
                {profile.streak > 0 && (
                  <span className="celebrate-pop flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', color: '#c2410c', border: '1px solid #fed7aa' }}>
                    🔥 {profile.streak}
                  </span>
                )}
              </>
            )}
            <button onClick={handleSignOut} className="btn-ghost text-xs">
              Çıxış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Welcome banner ───────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
             style={{
               background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 45%, #4338ca 100%)',
               boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
             }}>
          {/* Mesh işıqları — banneri canlandırır */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(280px 180px at 88% -10%, rgba(251,191,36,0.28), transparent 70%), radial-gradient(340px 240px at 5% 120%, rgba(165,180,252,0.35), transparent 70%)' }} />
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none"
               style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="absolute top-8 right-24 w-16 h-16 rounded-full pointer-events-none hidden sm:block"
               style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="relative flex-1">
            <p className="text-indigo-200 text-sm font-medium mb-0.5">
              {(() => { const h = new Date().getHours(); return h < 12 ? 'Sabahın xeyir ☀️' : h < 18 ? 'Günortan xeyir 👋' : 'Axşamın xeyir 🌙' })()}
            </p>
            <h1 className="text-white text-2xl font-bold tracking-tight">
              {profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Öyrənən'}
            </h1>
            {profile && profile.streak > 1 && (
              <p className="text-indigo-200 text-xs mt-1">🔥 {profile.streak} gündür dayanmırsan — davam!</p>
            )}
          </div>
          <div className="relative flex gap-3">
            {dueCount > 0 && (
              <Link href="/vocabulary"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-indigo-900 transition-transform hover:-translate-y-0.5"
                    style={{ background: 'white', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
                🗂️ {dueCount} kart hazırdır
              </Link>
            )}
            <Link href="/quiz"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.14)', color: 'white',
                           border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(8px)' }}>
              ✍️ Test Həll Et
            </Link>
          </div>
        </div>

        {/* ── Ad-soyad formu (köhnə hesablar üçün bir dəfəlik) ──── */}
        {profile && !profile.display_name && (
          <form onSubmit={handleSaveName} className="card" style={{ borderColor: '#c7d2fe' }}>
            <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-1)' }}>
              👤 Özünü tanıt
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
              Adını və soyadını yaz — sayt boyu sənə bu adla müraciət edək.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={nameFirst} onChange={(e) => setNameFirst(e.target.value)}
                     className="input flex-1" placeholder="Ad" required autoComplete="given-name" />
              <input type="text" value={nameLast} onChange={(e) => setNameLast(e.target.value)}
                     className="input flex-1" placeholder="Soyad" required autoComplete="family-name" />
              <button type="submit" disabled={nameSaving} className="btn-primary sm:w-auto">
                {nameSaving ? 'Saxlanır...' : 'Yadda saxla'}
              </button>
            </div>
          </form>
        )}

        {/* ── Stat cards (progress ring-lərlə) ─────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            // həftəlik dövr: 7 gün = tam dairə
            { label: 'Ardıcıl Gün', value: `${profile?.streak ?? 0}`, suffix: 'gün', icon: '🔥',
              accent: '#f97316', pct: Math.min(1, (profile?.streak ?? 0) / 7) },
            // 20 kart = tam dairə (gündəlik hədəf)
            { label: 'Bu Gün Due', value: `${dueCount}`, suffix: 'kart', icon: '🗂️',
              accent: dueCount > 0 ? '#6366f1' : '#10b981', pct: Math.min(1, dueCount / 20) },
            // CEFR nərdivanında mövqe: A1=1/6 ... C2=6/6
            { label: 'Səviyyə', value: profile?.level ?? '—', suffix: '', icon: '🎯',
              accent: '#6366f1',
              pct: (['A1','A2','B1','B2','C1','C2'].indexOf(profile?.level ?? '') + 1) / 6 },
          ].map((s) => {
            const r = 24
            const c = 2 * Math.PI * r
            return (
              <div key={s.label} className="card text-center" style={{ padding: '1rem 0.75rem' }}>
                <div className="relative w-14 h-14 mx-auto mb-2">
                  <svg width="56" height="56" viewBox="0 0 56 56" className="block">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4.5" />
                    <circle cx="28" cy="28" r={r} fill="none" stroke={s.accent} strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeDasharray={`${c * Math.max(0, s.pct)} ${c}`}
                            transform="rotate(-90 28 28)"
                            style={{ transition: 'stroke-dasharray 0.9s var(--ease)' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg">{s.icon}</span>
                </div>
                <div className="text-xl font-bold leading-none tracking-tight" style={{ color: s.accent }}>
                  {s.value}
                </div>
                {s.suffix && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{s.suffix}</div>}
                <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>{s.label}</div>
              </div>
            )
          })}
        </div>

        {/* ── TOLES Progress ───────────────────────────────────── */}
        {profile && (
          <div className="card" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>
                🎓 TOLES Sertifikat Yolu
              </h2>
              <Link href="/change-level"
                    className="text-xs font-medium"
                    style={{ color: 'var(--brand)' }}>
                Dəyiş →
              </Link>
            </div>
            <div className="flex items-center gap-0">
              {TOLES_STEP.map((step, idx) => {
                const isDone   = tolesIdx >= idx
                const isActive = tolesIdx === idx
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1 text-center">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mb-1.5 transition-all"
                           style={{
                             background: isDone ? step.color : 'var(--border)',
                             color: isDone ? 'white' : 'var(--text-3)',
                             boxShadow: isActive ? `0 0 0 4px ${step.color}33` : 'none',
                             transform: isActive ? 'scale(1.1)' : 'scale(1)',
                           }}>
                        {isDone && !isActive ? '✓' : idx + 1}
                      </div>
                      <div className="text-xs font-semibold" style={{ color: isDone ? step.color : 'var(--text-3)' }}>
                        {step.label}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{step.cefr}</div>
                    </div>
                    {idx < TOLES_STEP.length - 1 && (
                      <div className="h-0.5 flex-1 mx-1 rounded-full"
                           style={{ background: tolesIdx > idx ? step.color : 'var(--border)' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Navigation Cards ─────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
            ÖYRƏNMƏ MODULLARı
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {NAV_ITEMS(dueCount, profile?.level ?? 'B1', profile?.toles_level ?? 'Foundation').map((item) => (
              <Link key={item.title} href={item.href} className="nav-card"
                    style={item.urgent ? {
                      border: '1.5px solid #c7d2fe',
                      background: '#f5f3ff',
                    } : {}}>
                <div className="icon-wrap" style={{ background: item.iconBg }}>
                  {item.emoji}
                </div>
                <div className="nav-title">{item.title}</div>
                <div className="nav-desc">{item.desc}</div>
                <div className="nav-cta">
                  {item.cta}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── CEFR Ladder ──────────────────────────────────────── */}
        <CEFRLadder />

        {/* ── Weak Points ──────────────────────────────────────── */}
        <WeakPoints />

        {/* ── Daily Schedule ───────────────────────────────────── */}
        <DailySchedule />

        <div className="pb-8" />
      </main>

      <AITutorChat level={profile?.level ?? 'B1'} />
    </div>
  )
}
