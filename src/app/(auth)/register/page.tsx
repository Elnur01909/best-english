'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/supabase'
import { LEVEL_DESCRIPTIONS, TOLES_DESCRIPTIONS, cefrToToles } from '@/lib/utils'
import type { CEFRLevel } from '@/types'

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
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

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { cefrToToles } = await import('@/lib/utils')
      const tolesLevel = cefrToToles(level as CEFRLevel)

      const { error: updateError } = await import('@/lib/supabase').then(m =>
        m.updateUserLevel(data.user!.id, level, tolesLevel)
      )

      if (updateError) {
        setError('Səviyyə saxlanarkən xəta')
        setLoading(false)
        return
      }
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {step === 1 ? 'Hesab Yarat' : 'Səviyyəni Seç'}
          </h1>
          <p className="text-gray-500 mt-1">
            {step === 1
              ? 'Pulsuz qeydiyyat — bank kartı lazım deyil'
              : 'İstənilən vaxt dəyişə bilərsən'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Şifrə (minimum 6 simvol)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Davam Et →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                İngilis dilindəki cari səviyyəni seç:
              </p>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    level === l
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white">{l}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {LEVEL_DESCRIPTIONS[l]}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      TOLES: {cefrToToles(l)}
                    </span>
                  </div>
                </button>
              ))}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1"
                >
                  ← Geri
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Yaradılır...' : 'Başla →'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Hesabın var?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Daxil ol
          </Link>
        </p>
      </div>
    </div>
  )
}
