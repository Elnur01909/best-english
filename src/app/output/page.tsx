'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { getUser, getUserProfile, saveQuizResult } from '@/lib/supabase'
import { getRandomMessage } from '@/lib/psychology'
import { explainQuizError } from '@/lib/ai'
import AITutorChat from '@/components/AITutorChat'
import AudioPlayer from '@/components/AudioPlayer'
import ProfessorWidget from '@/components/ProfessorWidget'
import { saveSessionScore } from '@/lib/sessionScore'
import quizData from '@/data/quizzes.json'
import vocabData from '@/data/vocab.json'
import type { VocabItem } from '@/types'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function OutputContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topicsParam = searchParams.get('topics')

  const [userId, setUserId] = useState<string | null>(null)
  const [userLevel, setUserLevel] = useState('B1')

  const INITIAL_COUNT = 5

  // Topics filtri ilə sual seç, hər sualın options-ını da qarışdır
  const initialQuestions = useMemo(() => {
    const all = quizData as any[]
    const filtered = topicsParam
      ? all.filter(q => topicsParam.split(',').includes(q.topic))
      : all
    const pool = filtered.length >= INITIAL_COUNT ? filtered : all
    return shuffle(pool).slice(0, INITIAL_COUNT).map((q: any) => ({
      ...q, options: shuffle(q.options)
    }))
  }, [topicsParam])

  const TOTAL_UNIQUE = initialQuestions.length

  // Queue — yanlış cavablar geri əlavə olunur
  const [queue, setQueue] = useState(initialQuestions)
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [mastered, setMastered] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)

  // Gec cavab verəndə professor "düşünməyə" başlasın
  useEffect(() => {
    setThinking(false)
    if (selected || !queue[qIdx]) return
    const t = setTimeout(() => setThinking(true), 8000)
    return () => clearTimeout(t)
  }, [qIdx, selected, queue])

  useEffect(() => {
    getUser().then(u => {
      if (!u) { router.push('/login'); return }
      setUserId(u.id)
    })
    getUserProfile && getUser().then(async u => {
      if (!u) return
      const { data } = await getUserProfile(u.id)
      if (data?.level) setUserLevel(data.level)
    })
  }, [router])

  const current = queue[qIdx]
  const progressPct = Math.round((mastered.size / TOTAL_UNIQUE) * 100)

  async function handleSelect(option: string) {
    if (selected) return
    setSelected(option)
    const correct = option === current.correct

    if (correct) {
      const next = new Set(mastered); next.add(current.id)
      setMastered(next)
      const score = Math.round((next.size / TOTAL_UNIQUE) * 100)
      saveSessionScore('evening', score)
    } else {
      // Yanlış — geri əlavə et
      setQueue(prev => {
        const rem = prev.slice(qIdx + 1)
        const at = Math.min(Math.floor(Math.random() * 3) + 1, rem.length)
        const n = [...rem]; n.splice(at, 0, { ...current, options: shuffle(current.options) })
        return [...prev.slice(0, qIdx + 1), ...n]
      })
    }

    setFeedback(getRandomMessage(correct ? 'success' : 'wrong_answer'))
    if (userId) {
      await saveQuizResult({ user_id: userId, quiz_id: current.id, correct, time_taken: 0 })
    }
  }

  async function askAiExplain() {
    if (!current) return
    setAiLoading(true); setAiError(null)
    try {
      const exp = await explainQuizError(current.question, current.correct, selected ?? '—', userLevel)
      setAiExplanation(exp)
    } catch (err: any) {
      if (err.message === 'SHARED_LIMIT' || err.message === 'NO_KEY')
        setAiError('Gündəlik pulsuz limit doldu — 🎓 düyməsindən öz pulsuz açarını əlavə et.')
      else if (err.message === 'BAD_KEY')
        setAiError('API açarı yanlışdır. 🎓 düyməsindən yenidən daxil et.')
      else if (err.message === 'RATE_LIMIT')
        setAiError('Bir az gözlə (sürət limiti) və yenidən cəhd et.')
      else
        setAiError('Xəta: ' + (err.message ?? 'Bilinmir'))
    } finally { setAiLoading(false) }
  }

  function next() {
    if (mastered.size === TOTAL_UNIQUE || qIdx + 1 >= queue.length) {
      saveSessionScore('evening', Math.round((mastered.size / TOTAL_UNIQUE) * 100))
      setDone(true)
    } else {
      setQIdx(i => i + 1); setSelected(null); setFeedback(null)
      setAiExplanation(null); setAiError(null)
    }
  }

  const header = (
    <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
      <button onClick={() => router.push('/dashboard')} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">🏠 Ana Səhifə</button>
      <span className="font-semibold text-gray-900 dark:text-white text-sm">🌆 Output: Quiz</span>
      <span className="text-sm text-gray-400">{mastered.size}/{TOTAL_UNIQUE} ✓</span>
    </header>
  )

  // ─── Nəticə ─────────────────────────────────────────────
  if (done) {
    const finalPct = Math.round((mastered.size / TOTAL_UNIQUE) * 100)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        {header}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="card max-w-sm w-full text-center">
            <div className="text-5xl mb-3">{finalPct >= 80 ? '🏆' : finalPct >= 60 ? '👍' : '💪'}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Output: Quiz</h2>
            <p className="text-3xl font-bold text-blue-600 mb-1">{mastered.size}/{TOTAL_UNIQUE}</p>
            <p className="text-gray-500 mb-1">Mənimsənildi: <strong>{finalPct}%</strong></p>
            <p className="text-xs text-gray-400 mb-5">Günlük töhfə: {Math.round(finalPct * 25 / 100)}% (25%-dən)</p>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
              <div className={`h-3 rounded-full ${finalPct >= 80 ? 'bg-green-500' : finalPct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${finalPct}%` }} />
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 mb-6">
              💡 Yanlış cavab verdiyin suallar yenidən qarşına çıxdı. Tam mənimsəmək üçün əla nəticə!
            </div>
            <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">Ana Səhifəyə Qayıt →</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Quiz ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header}
      {/* Progress bar */}
      <div className="h-2 bg-gray-200">
        <div className="h-2 bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="px-4 py-1.5 bg-white dark:bg-gray-900 border-b flex justify-between text-xs text-gray-500">
        <span>✓ Mənimsənildi: <strong className="text-green-600">{mastered.size}/{TOTAL_UNIQUE}</strong></span>
        <span className="font-medium text-blue-600">{progressPct}%</span>
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {current && (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{current.topic}</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                  {current.question}
                </h2>
              </div>
              <ProfessorWidget
                mood={selected ? (selected === current?.correct ? 'happy' : 'disappointed') : thinking ? 'thinking' : 'neutral'}
                message={selected ? feedback : null}
              />
            </div>
            <div className="mb-5">
              <AudioPlayer word={current.question} variant="sentence" isSentence={true} />
            </div>

            <div className="space-y-3 mb-6">
              {current.options.map((opt: string) => {
                const isCorrect = opt === current.correct
                const isSel = opt === selected
                let cls = 'flex-1 p-3.5 rounded-xl border-2 text-left font-medium transition-all '
                if (!selected) cls += 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50'
                else if (isCorrect) cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800'
                else if (isSel) cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800'
                else cls += 'border-gray-200 opacity-40'
                return (
                  <div key={opt} className="flex items-center gap-2">
                    <button onClick={() => handleSelect(opt)} className={cls}>
                      {selected && isCorrect ? '✓ ' : selected && isSel ? '✗ ' : ''}{opt}
                    </button>
                    {/* Səsləndirmə — sağda (bütün test səhifələrində eyni) */}
                    <AudioPlayer word={opt} variant="icon" />
                  </div>
                )
              })}
            </div>

            {selected && (
              <>
                {feedback && (
                  <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center ${
                    selected === current.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selected === current.correct ? '✓ Düzgün!' : '✗ Yanlış — yenidən qarşına çıxacaq 🔄'}
                  </div>
                )}
                {(() => {
                  const vocab = (vocabData as VocabItem[]).find(
                    v => v.term.toLowerCase() === current.correct.toLowerCase()
                  )
                  return (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 İzah (EN):</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{current.explanation}</p>
                        <div className="mt-1.5">
                          <AudioPlayer word={current.explanation} variant="sentence" isSentence={true} />
                        </div>
                      </div>
                      {vocab && (
                        <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">🇦🇿 Azərbaycanca:</p>
                          <p className="text-sm text-green-800 dark:text-green-300">{vocab.az_translation}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
                {!aiExplanation && (
                  <button onClick={askAiExplain} disabled={aiLoading}
                    className="w-full mb-4 py-2.5 rounded-xl border-2 border-purple-300 text-purple-700 text-sm font-medium disabled:opacity-50">
                    {aiLoading ? '🎓 Müəllim düşünür...' : '🎓 AI Müəllim daha ətraflı izah etsin'}
                  </button>
                )}
                {aiError && <p className="text-red-500 text-xs mb-4 text-center">{aiError}</p>}
                {aiExplanation && (
                  <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-purple-700 mb-1">🎓 AI Müəllim:</p>
                    <p className="text-sm text-purple-800 whitespace-pre-wrap">{aiExplanation}</p>
                  </div>
                )}
                <button onClick={next} className="btn-primary w-full">
                  {mastered.size === TOTAL_UNIQUE || qIdx + 1 >= queue.length ? 'Nəticəni gör →' : 'Növbəti sual →'}
                </button>
              </>
            )}
          </>
        )}
      </main>
      <AITutorChat level={userLevel} />
    </div>
  )
}

export default function OutputPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>}>
      <OutputContent />
    </Suspense>
  )
}
