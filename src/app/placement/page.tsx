'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, updateUserLevel } from '@/lib/supabase'
import { cefrToToles } from '@/lib/utils'
import placementData from '@/data/placement.json'
import placementData2 from '@/data/placement2.json'
import type { CEFRLevel } from '@/types'

const ALL_QUESTIONS = [...placementData, ...placementData2]

interface PQuestion {
  id: number
  level: CEFRLevel
  question: string
  options: string[]
  correct: string
}

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Skor məntiqi: ümumi düzgün cavab sayına görə səviyyə təyin et
// 18 sual, hər 3 sual = 1 səviyyə
// 0–2 → A1, 3–5 → A2, 6–8 → B1, 9–11 → B2, 12–14 → C1, 15–18 → C2
function computeLevel(correctByLevel: Record<string, number>, totalByLevel: Record<string, number>): CEFRLevel {
  const total = Object.values(totalByLevel).reduce((a, b) => a + b, 0)
  const correct = Object.values(correctByLevel).reduce((a, b) => a + b, 0)
  const pct = total > 0 ? correct / total : 0

  if (pct >= 0.83) return 'C2'   // 15–18/18
  if (pct >= 0.67) return 'C1'   // 12–14/18
  if (pct >= 0.50) return 'B2'   // 9–11/18
  if (pct >= 0.33) return 'B1'   // 6–8/18
  if (pct >= 0.17) return 'A2'   // 3–5/18
  return 'A1'                    // 0–2/18
}

export default function PlacementPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const [stage, setStage] = useState<'intro' | 'test' | 'result'>('intro')
  const [result, setResult] = useState<CEFRLevel | null>(null)
  const [saving, setSaving] = useState(false)

  // Hər səviyyədən təsadüfi 3 sual seç (180-lik hovuzdan), sonra suallar+variantlar qarışsın
  const questions = useMemo(() => {
    const pool = ALL_QUESTIONS as PQuestion[]
    const picked: PQuestion[] = []
    for (const lvl of LEVELS) {
      const ofLevel = shuffle(pool.filter((q) => q.level === lvl))
      picked.push(...ofLevel.slice(0, 3))
    }
    return shuffle(picked).map((q) => ({ ...q, options: shuffle(q.options) }))
  }, [])

  useEffect(() => {
    getUser().then((u) => {
      if (!u) router.push('/login')
      else setUserId(u.id)
    })
  }, [router])

  const current = questions[idx]

  function answer(option: string) {
    if (selected) return
    setSelected(option)
    setAnswers((a) => ({ ...a, [current.id]: option === current.correct }))
  }

  async function next() {
    if (idx + 1 >= questions.length) {
      // Hesabla
      const correctByLevel: Record<string, number> = {}
      const totalByLevel: Record<string, number> = {}
      questions.forEach((q) => {
        totalByLevel[q.level] = (totalByLevel[q.level] ?? 0) + 1
        if (answers[q.id]) correctByLevel[q.level] = (correctByLevel[q.level] ?? 0) + 1
      })
      const lvl = computeLevel(correctByLevel, totalByLevel)
      setResult(lvl)
      setStage('result')
      if (userId) {
        setSaving(true)
        await updateUserLevel(userId, lvl, cefrToToles(lvl))
        setSaving(false)
      }
    } else {
      setIdx((i) => i + 1)
      setSelected(null)
    }
  }

  // ─── Intro ─────────────────────────────────
  if (stage === 'intro') return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-5xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Səviyyə Ölçmə Testi</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          18 sual — qrammatika və lüğət. Sənin İngilis dili səviyyəni (A1–C2) avtomatik təyin edəcək.
          Bilmədiyin sual olsa, ən yaxşı təxminini seç. ~3 dəqiqə.
        </p>
        <button onClick={() => setStage('test')} className="btn-primary w-full">
          Testə Başla →
        </button>
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-sm mt-3 block w-full hover:text-gray-600">
          İndi yox, keç
        </button>
      </div>
    </div>
  )

  // ─── Nəticə ────────────────────────────────
  if (stage === 'result' && result) {
    const totalCorrect = Object.values(answers).filter(Boolean).length
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-gray-500 mb-1">Sənin səviyyən:</p>
          <h2 className="text-4xl font-bold text-blue-600 mb-2">{result}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-1">TOLES: {cefrToToles(result)}</p>
          <p className="text-sm text-gray-500 mb-6">{totalCorrect} / {questions.length} düzgün cavab</p>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200 mb-6">
            💡 Səviyyən profilinə yazıldı. İstənilən vaxt "Səviyyəni Dəyiş"dən dəyişə bilərsən.
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? 'Saxlanılır...' : 'Dashboard-a keç →'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Test ──────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-blue-600">Səviyyə Testi</span>
        <span className="text-sm text-gray-500">{idx + 1} / {questions.length}</span>
      </header>
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-blue-500 transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        {current && (
          <div className="w-full max-w-lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center leading-relaxed">
              {current.question}
            </h2>
            <div className="space-y-3">
              {current.options.map((opt) => {
                const isCorrect = opt === current.correct
                const isSelected = opt === selected
                let cls = 'w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all '
                if (!selected) {
                  cls += 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                } else if (isCorrect) {
                  cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300'
                } else if (isSelected) {
                  cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300'
                } else {
                  cls += 'border-gray-200 dark:border-gray-700 opacity-50'
                }
                return (
                  <button key={opt} onClick={() => answer(opt)} className={cls}>
                    {selected && isCorrect ? '✓ ' : selected && isSelected ? '✗ ' : ''}{opt}
                  </button>
                )
              })}
            </div>
            {selected && (
              <button onClick={next} className="btn-primary w-full mt-6">
                {idx + 1 >= questions.length ? 'Nəticəni gör →' : 'Növbəti →'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
