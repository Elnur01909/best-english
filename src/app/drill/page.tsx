'use client'
import { useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getUser, saveQuizResult } from '@/lib/supabase'
import { saveSessionScore } from '@/lib/sessionScore'
import { getRandomMessage } from '@/lib/psychology'
import AudioPlayer from '@/components/AudioPlayer'
import AITutorChat from '@/components/AITutorChat'
import ProfessorAvatar from '@/components/ProfessorAvatar'
import quizzesData from '@/data/quizzes.json'
import vocabData from '@/data/vocab.json'
import type { VocabItem } from '@/types'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

interface DrillQ {
  id: number
  question: string
  options: string[]
  correct: string
  explanation: string
  topic: string
}

function DrillContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topic = searchParams.get('topic') ?? ''

  // Həmin mövzudan suallar
  const initialQs = useMemo((): DrillQ[] => {
    const topicQs = (quizzesData as any[])
      .filter(q => q.topic === topic)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      .map(q => ({ ...q, options: shuffle(q.options) }))
    return topicQs
  }, [topic])

  const TOTAL = initialQs.length

  const [queue, setQueue] = useState<DrillQ[]>(initialQs)
  const [mastered, setMastered] = useState<Set<number>>(new Set())
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const current = queue[qIdx]
  const progressPct = TOTAL > 0 ? Math.round((mastered.size / TOTAL) * 100) : 0

  async function select(opt: string) {
    if (selected) return
    setSelected(opt)
    const correct = opt === current.correct

    setFeedback(getRandomMessage(correct ? 'success' : 'wrong_answer'))

    const user = await getUser()
    if (user) {
      await saveQuizResult({ user_id: user.id, quiz_id: current.id, correct, time_taken: 0 })
    }

    if (correct) {
      const next = new Set(mastered); next.add(current.id)
      setMastered(next)
      saveSessionScore('drill', Math.round((next.size / TOTAL) * 100))
    } else {
      // Yanlış → növbəti 1-3 suala əlavə et
      setQueue(prev => {
        const rem = prev.slice(qIdx + 1)
        const at = Math.min(Math.floor(Math.random() * 3) + 1, rem.length)
        const n = [...rem]
        n.splice(at, 0, { ...current, options: shuffle(current.options) })
        return [...prev.slice(0, qIdx + 1), ...n]
      })
    }
  }

  function next() {
    if (mastered.size === TOTAL) { setDone(true); return }
    setQIdx(i => i + 1); setSelected(null); setFeedback(null)
  }

  // ─── Nəticə ───────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-5xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Drill Tamamlandı!</h2>
          <p className="text-gray-500 mb-1 font-medium">{topic}</p>
          <p className="text-3xl font-bold text-orange-600 mb-4">{mastered.size}/{TOTAL} mənimsənildi</p>
          <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-3 text-xs text-orange-800 dark:text-orange-200 mb-6">
            💪 Bu mövzuda məşq etdin. Sabah yenidən bax — spaced repetition effektini artırar.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setQueue(initialQs.sort(()=>Math.random()-0.5)); setMastered(new Set()); setQIdx(0); setSelected(null); setDone(false) }}
              className="btn-secondary flex-1"
            >
              Yenidən
            </button>
            <button onClick={() => router.push('/dashboard')} className="btn-primary flex-1">
              Ana Səhifə
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (TOTAL === 0) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <p className="text-gray-500">Bu mövzu üçün sual tapılmadı.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary w-full mt-4">Ana Səhifə</button>
      </div>
    </div>
  )

  // AZ translation for vocab
  const vocabMatch = (vocabData as VocabItem[]).find(v => v.term === current.correct)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.push('/dashboard')} className="text-sm font-medium text-blue-600">🏠 Ana Səhifə</button>
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">🎯 Drill: {topic}</p>
        </div>
        <span className="text-sm text-gray-400">{mastered.size}/{TOTAL} ✓</span>
      </header>

      {/* Progress */}
      <div className="h-2 bg-gray-200">
        <div className="h-2 bg-orange-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="px-4 py-1.5 bg-white dark:bg-gray-900 border-b flex justify-between text-xs text-gray-500">
        <span>✓ Mənimsənildi: <strong className="text-green-600">{mastered.size}/{TOTAL}</strong></span>
        <span className="font-medium text-orange-600">{progressPct}%</span>
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-relaxed">
            {current?.question}
          </p>
          <AudioPlayer word={current?.question ?? ''} variant="sentence" isSentence={true} />
        </div>

        <div className="space-y-3 mb-6">
          {current?.options.map(opt => {
            const isCorrect = opt === current.correct
            const isSel = opt === selected
            let cls = 'w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all '
            if (!selected) cls += 'border-gray-200 dark:border-gray-700 hover:border-orange-400 hover:bg-orange-50'
            else if (isCorrect) cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800'
            else if (isSel) cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800'
            else cls += 'border-gray-200 opacity-40'
            return (
              <button key={opt} onClick={() => select(opt)} className={cls}>
                {selected && isCorrect ? '✓ ' : selected && isSel ? '✗ ' : ''}{opt}
              </button>
            )
          })}
        </div>

        {selected && (
          <>
            {feedback && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-3 ${
                selected === current.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <ProfessorAvatar mood={selected === current.correct ? 'happy' : 'annoyed'} size={40} />
                <span>{selected === current.correct ? '✓ Düzgün!' : '✗ Yanlış — yenidən qarşına çıxacaq 🔄'}</span>
              </div>
            )}
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4 space-y-2">
              <div>
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">💡 İzah (EN):</p>
                <p className="text-sm text-orange-800 dark:text-orange-200">{current?.explanation}</p>
                <div className="mt-1"><AudioPlayer word={current?.explanation ?? ''} variant="sentence" isSentence={true} /></div>
              </div>
              {vocabMatch && (
                <div className="border-t border-orange-200 dark:border-orange-800 pt-2">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-0.5">🇦🇿 Azərbaycanca:</p>
                  <p className="text-sm text-green-800 dark:text-green-300">{vocabMatch.az_translation}</p>
                </div>
              )}
            </div>
            <button onClick={next} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors">
              {mastered.size === TOTAL ? 'Nəticəni gör →' : 'Növbəti →'}
            </button>
          </>
        )}
      </main>
      <AITutorChat level="B2" />
    </div>
  )
}

export default function DrillPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>}>
      <DrillContent />
    </Suspense>
  )
}
