'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, supabase } from '@/lib/supabase'
import { useEffect } from 'react'

const WHY_OPTIONS = [
  { id: 'career', emoji: '💼', title: 'Karyera', desc: 'İş, promosyon, TOLES sertifikat' },
  { id: 'passion', emoji: '❤️', title: 'Sevgi', desc: 'Dili sevdiyim üçün, kültürə ilgi' },
  { id: 'travel', emoji: '✈️', title: 'Səyahət', desc: 'Dünyada rahat danışmaq' },
  { id: 'brain', emoji: '🧠', title: 'Beyin', desc: 'Öyrənmə prosesini sevim' },
  { id: 'family', emoji: '👨‍👩‍👧', title: 'Ailə', desc: 'Sevdiklərimiz ilə əlaqə' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedWhy, setSelectedWhy] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getUser().then((u) => {
      if (!u) router.push('/login')
    })
  }, [router])

  async function handleContinue() {
    if (!selectedWhy) return

    setLoading(true)
    const user = await getUser()
    if (!user) return

    // Supabase profile-a "why" saxla
    await supabase
      .from('user_profiles')
      .update({ learning_motivation: selectedWhy })
      .eq('id', user.id)

    // Onboarding-u tamamlanmış kimi işarələ
    await supabase
      .from('user_profiles')
      .update({ onboarded: true })
      .eq('id', user.id)

    router.push('/placement')
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Xoş gəldin!
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              İngilis dilini öyrənmə səyahətinə başlamaqdan əvvəl, səni bir sual var...
            </p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🎯 Nə üçün ingilis dilini öyrənirsiniz?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Bu sualın cavabı sizi motivasyon yaşında tutacaq. Valideyniz deyil, siz istəyirsiniz.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {WHY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedWhy(opt.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedWhy === opt.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{opt.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!selectedWhy}
            className="btn-primary w-full"
          >
            Davam Et →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌱</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Böyüməyə Açıq Düşüncə
          </h1>
          <div className="space-y-3 text-left bg-green-50 dark:bg-green-950 p-6 rounded-xl">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Carol Dweck:</strong> Öyrənmə bacarıq deyil — bu bir proses. Xətalar ağrı deyil, ağlamadır.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Elmi fakt: Growth mindset-li öyrənənlər eyni şəraitdə <strong>30–40% daha sürətli</strong> irəliləyir.
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="card border-l-4 border-blue-500">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bu dən sonra:</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>✓ Xəta etdim → "Beynəm güclənir"</li>
              <li>✓ Çətin cəhd → "Mən irəliləyirəm"</li>
              <li>✓ Qalxırıq → "Hələ bu həftə var"</li>
            </ul>
          </div>

          <div className="card border-l-4 border-orange-500">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Affective Filter (Təhlükəsiz Mühit):</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bu tətbiqdə sənə <strong>heç kəs mühakimə etməyəcək</strong>. Xəta = məlumat. Cərimə yoxdur.
            </p>
          </div>
        </div>

        <button onClick={handleContinue} disabled={loading} className="btn-primary w-full">
          {loading ? 'Başlamaq...' : 'Başlamağa Hazırım! →'}
        </button>
      </div>
    </div>
  )
}
