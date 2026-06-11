'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword, supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase email link → URL-dən session qur
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Şifrələr uyğun gəlmir.')
      return
    }
    if (password.length < 6) {
      setError('Şifrə ən az 6 simvol olmalıdır.')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await updatePassword(password)
    if (error) {
      setError('Xəta baş verdi: ' + error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--bg)' }}>
        <div className="card text-center animate-fade-up" style={{ padding: '2rem 1.5rem', maxWidth: 360, width: '100%' }}>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>Şifrə yeniləndi!</h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Dashboard-a yönləndirilirsiniz...</p>
        </div>
      </div>
    )
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

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
          Yeni Şifrə Yarat 🔑
        </h1>
        <p className="text-sm mb-7" style={{ color: 'var(--text-2)' }}>
          Güclü bir şifrə seç — ən az 6 simvol.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-1)' }}>
              Yeni Şifrə
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              minLength={6}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-1)' }}>
              Şifrəni Təsdiqlə
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: password.length < 6 ? '25%'
                       : password.length < 10 ? '60%'
                       : '100%',
                  background: password.length < 6 ? '#ef4444'
                             : password.length < 10 ? '#f59e0b'
                             : '#10b981',
                }} />
              </div>
              <p className="text-xs mt-1" style={{
                color: password.length < 6 ? '#ef4444'
                     : password.length < 10 ? '#d97706'
                     : '#059669',
              }}>
                {password.length < 6 ? 'Çox qısa' : password.length < 10 ? 'Orta' : 'Güclü ✓'}
              </p>
            </div>
          )}

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
                Yenilənir...
              </span>
            ) : 'Şifrəni Yenilə →'}
          </button>
        </form>
      </div>
    </div>
  )
}
