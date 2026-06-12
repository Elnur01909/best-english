'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp, updateProfile } from '@/lib/supabase'
import { LEVEL_DESCRIPTIONS, cefrToToles } from '@/lib/utils'
import type { CEFRLevel } from '@/types'

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const LEVEL_META: Record<CEFRLevel, { emoji: string; color: string; bg: string }> = {
  A1: { emoji: '🌱', color: '#059669', bg: '#d1fae5' },
  A2: { emoji: '🌿', color: '#16a34a', bg: '#bbf7d0' },
  B1: { emoji: '📚', color: '#2563eb', bg: '#dbeafe' },
  B2: { emoji: '🔬', color: '#7c3aed', bg: '#ede9fe' },
  C1: { emoji: '🏛️', color: '#9333ea', bg: '#f3e8ff' },
  C2: { emoji: '🎓', color: '#c2410c', bg: '#ffedd5' },
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [level, setLevel] = useState<CEFRLevel>('B1')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setLoading(true)
    setError('')

    const { data, error } = await signUp(email, password)
    if (error) { setError(error.message); setLoading(false); return }

    if (data.user) {
      const tolesLevel = cefrToToles(level as CEFRLevel)
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { error: updateError } = await updateProfile(data.user.id, {
        level,
        toles_level: tolesLevel,
        display_name: displayName,
      })
      if (updateError) { setError('Profil saxlanarkən xəta'); setLoading(false); return }
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Left panel */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between w-1/2 p-12"
           style={{ background: 'linear-gradient(145deg, #6366f1 0%, #4338ca 60%, #312e81 100%)' }}>
        {/* Aurora dekor */}
        <div className="hero-orb w-72 h-72 -top-16 -right-16" style={{ background: 'rgba(251,191,36,0.18)' }} />
        <div className="hero-orb w-80 h-80 bottom-0 -left-24" style={{ background: 'rgba(165,180,252,0.22)', animationDelay: '3s' }} />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 text-white font-bold text-sm">
            BE
          </div>
          <span className="text-white font-bold text-lg">Best English</span>
        </div>

        <div className="relative">
          <div className="text-5xl mb-6 float-slow inline-block">🎓</div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4" style={{ letterSpacing: '-0.02em' }}>
            İngilis dilini<br/>peşəkar səviyyədə öyrən
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed">
            A1-dən C2-yə — elmi SRS metodu, interaktiv dərslər və
            canlı yarış sistemi. Üstəlik TOLES sertifikat hazırlığı.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 max-w-xs">
            {[
              { value: '~1600', label: 'Test sualı' },
              { value: '378',   label: 'Hüquqi termin' },
              { value: '27',    label: 'Mini-dərs' },
              { value: '14',    label: 'Case Study' },
            ].map((s) => (
              <div key={s.label} className="glass-dark rounded-xl px-3.5 py-3">
                <div className="text-white text-xl font-extrabold" style={{ letterSpacing: '-0.02em' }}>{s.value}</div>
                <div className="text-indigo-200 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-indigo-300 text-xs">© 2026 Best English · Pulsuz qeydiyyat</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>BE</div>
            <span className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Best English</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                     style={{
                       background: step >= s ? 'var(--brand)' : 'var(--border)',
                       color: step >= s ? 'white' : 'var(--text-3)',
                     }}>
                  {step > s ? '✓' : s}
                </div>
                {s < 2 && <div className="w-8 h-0.5 rounded" style={{ background: step > s ? 'var(--brand)' : 'var(--border)' }} />}
              </div>
            ))}
            <span className="text-xs ml-1" style={{ color: 'var(--text-2)' }}>
              {step === 1 ? 'Hesab məlumatları' : 'Səviyyəni seç'}
            </span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
            {step === 1 ? 'Hesab Yarat 🚀' : 'Səviyyəni Seç 🎯'}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            {step === 1 ? 'Pulsuz — bank kartı lazım deyil' : 'İstənilən vaxt dəyişə bilərsən'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-1)' }}>Ad</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                           className="input" placeholder="Elnur" required autoComplete="given-name" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-1)' }}>Soyad</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                           className="input" placeholder="Məmmədov" required autoComplete="family-name" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-1)' }}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                         className="input" placeholder="email@example.com" required autoComplete="email" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-1)' }}>
                    Şifrə <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(min. 6 simvol)</span>
                  </label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                         className="input" placeholder="••••••••" minLength={6} required autoComplete="new-password" />
                </div>
                <button type="submit" className="btn-primary w-full">Davam Et →</button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {LEVELS.map((l) => {
                    const meta = LEVEL_META[l]
                    const selected = level === l
                    return (
                      <button key={l} type="button" onClick={() => setLevel(l)}
                              className="w-full text-left p-3 rounded-xl transition-all"
                              style={{
                                border: `2px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
                                background: selected ? 'var(--brand-subtle)' : 'var(--surface)',
                              }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                 style={{ background: meta.bg }}>
                              {meta.emoji}
                            </div>
                            <div>
                              <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{l}</span>
                              <span className="text-xs ml-2" style={{ color: 'var(--text-2)' }}>
                                {LEVEL_DESCRIPTIONS[l]}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                            TOLES: {cefrToToles(l)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-sm"
                       style={{ background: 'var(--danger-light)', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                    <span>⚠️</span><span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Geri</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Yaradılır...
                      </span>
                    ) : 'Başla 🎯'}
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-5 text-center text-sm" style={{ color: 'var(--text-2)' }}>
            Hesabın var?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--brand)' }}>
              Daxil ol
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
