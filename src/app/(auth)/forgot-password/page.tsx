'use client'
import { useState } from 'react'
import Link from 'next/link'
import { resetPasswordForEmail } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'https://best-english-lovat.vercel.app/reset-password'

    const { error } = await resetPasswordForEmail(email, redirectTo)

    if (error) {
      setError('Xəta baş verdi. Email düzgündür?')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
               style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            BE
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Best English</span>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div className="card text-center" style={{ padding: '2rem 1.5rem' }}>
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
              Email göndərildi!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
              <strong>{email}</strong> ünvanına şifrə sıfırlama linki göndərildi.
              Email-i yoxla (spam qovluğuna da bax).
            </p>
            <Link href="/login" className="btn-primary w-full">
              Girişə Qayıt
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
              Şifrəni Unut? 🔐
            </h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text-2)' }}>
              Email-ini daxil et, sıfırlama linki göndərəcəyik.
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
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-sm"
                     style={{ background: 'var(--danger-light)', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Göndərilir...
                  </span>
                ) : 'Sıfırlama Linki Göndər →'}
              </button>
            </form>

            <div className="mt-5 text-center text-sm" style={{ color: 'var(--text-2)' }}>
              <Link href="/login" className="font-medium" style={{ color: 'var(--brand)' }}>
                ← Girişə qayıt
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
