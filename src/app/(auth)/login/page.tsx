'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email və ya şifrə yanlışdır.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Left panel — decorative (hidden on mobile) */}
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
          <div className="text-5xl mb-6 float-slow inline-block">⚖️</div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4" style={{ letterSpacing: '-0.02em' }}>
            TOLES Sertifikatına<br/>elmi metodla hazırlaş
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed">
            SRS alqoritmi, 9 test formatı, 27 dərs və canlı rəqabət
            ilə hüquq ingilis dilini mənimsə.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: '🧠', text: '378 hüquqi termin, SM-2 alqoritmi' },
              { icon: '📝', text: '~1600 sual, Foundation→Advanced' },
              { icon: '🏆', text: 'Canlı TOLES Mini-Test yarışı' },
            ].map((f) => (
              <div key={f.text} className="glass-dark flex items-center gap-3 px-3.5 py-2.5 rounded-xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                     style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {f.icon}
                </div>
                <span className="text-indigo-100 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-indigo-300 text-xs">
          © 2026 Best English · TOLES Hazırlıq Platforması
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              BE
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Best English</span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
            Xoş gəldin 👋
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--text-2)' }}>
            Hesabına daxil ol
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-1)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Şifrə</label>
                <Link href="/forgot-password" className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
                  Şifrəni unutdum?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-sm"
                   style={{ background: 'var(--danger-light)', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Daxil olunur...
                </span>
              ) : 'Daxil Ol →'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm" style={{ color: 'var(--text-2)' }}>
            Hesabın yoxdur?{' '}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--brand)' }}>
              Qeydiyyatdan keç
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
