'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, saveQuizResult } from '@/lib/supabase'
import { getRandomMessage } from '@/lib/psychology'
import { analyzeWeakPoints } from '@/lib/analysis'
import { explainQuizError } from '@/lib/ai'
import AITutorChat from '@/components/AITutorChat'
import ProfessorWidget from '@/components/ProfessorWidget'
import AudioPlayer from '@/components/AudioPlayer'
import quizData from '@/data/quizzes.json'
import vocabData from '@/data/vocab.json'
import type { QuizQuestion, QuizLevel, VocabItem } from '@/types'

const LEVELS: QuizLevel[] = ['Foundation', 'Higher', 'Advanced']
const LEVEL_COLORS = {
  Foundation: 'bg-emerald-600',
  Higher: 'bg-blue-600',
  Advanced: 'bg-red-600',
}

type Stage = 'select' | 'quiz' | 'result'

// Sual formatı nişanları
const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  'gap-fill':       { label: '📝 Boşluğu doldur', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  'collocation':    { label: '🔗 Kollokasiya',    cls: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' },
  'preposition':    { label: '🔤 Sözönü',         cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  'classification': { label: '⚖️ Təsnifat',       cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  'true-false':     { label: '✓✗ Doğru/Yanlış',   cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
}

export default function QuizPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('select')
  const [level, setLevel] = useState<QuizLevel>('Foundation')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [startTime, setStartTime] = useState<number>(0)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [weakPoints, setWeakPoints] = useState<Array<{ topic: string; errorRate: number; recommendation: string }>>([])
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Zəif nöqtə analizi — result stage-də
  useEffect(() => {
    if (stage === 'result' && questions.length > 0) {
      const analysis = analyzeWeakPoints(
        questions as any[],
        results
      )
      setWeakPoints(analysis)
    }
  }, [stage, questions, results])

  // Gec cavab verəndə professor "düşünməyə" başlasın
  useEffect(() => {
    setThinking(false)
    if (showAnswer || !questions[currentIdx]) return
    const t = setTimeout(() => setThinking(true), 8000)
    return () => clearTimeout(t)
  }, [currentIdx, showAnswer, questions])

  useEffect(() => {
    getUser().then((u) => {
      if (!u) router.push('/login')
      else setUserId(u.id)
    })
  }, [router])

  function startQuiz() {
    const filtered = (quizData as QuizQuestion[])
      .filter((q) => q.level === level)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      // Variantları da qarışdır ki, düzgün cavab həmişə eyni mövqedə olmasın
      .map((q) => ({ ...q, options: [...q.options].sort(() => Math.random() - 0.5) }))
    setQuestions(filtered)
    setCurrentIdx(0)
    setResults([])
    setSelected(null)
    setShowAnswer(false)
    setStartTime(Date.now())
    setStage('quiz')
  }

  async function handleSelect(option: string) {
    if (showAnswer) return
    setSelected(option)
    setShowAnswer(true)

    const q = questions[currentIdx]
    const correct = option === q.correct
    const timeTaken = Math.round((Date.now() - startTime) / 1000)

    if (userId) {
      await saveQuizResult({
        user_id: userId,
        quiz_id: q.id,
        correct,
        time_taken: timeTaken,
      })
    }

    setResults((r) => [...r, correct])
    setFeedbackMsg(getRandomMessage(correct ? 'success' : 'wrong_answer'))
  }

  function nextQuestion() {
    if (currentIdx + 1 >= questions.length) {
      setStage('result')
    } else {
      setCurrentIdx((i) => i + 1)
      setSelected(null)
      setShowAnswer(false)
      setStartTime(Date.now())
      setFeedbackMsg(null)
      setAiExplanation(null)
      setAiError(null)
    }
  }

  async function askAiExplain() {
    if (!current) return
    setAiLoading(true)
    setAiError(null)
    try {
      const exp = await explainQuizError(
        current.question,
        current.correct,
        selected ?? '—',
        level
      )
      setAiExplanation(exp)
    } catch (err: any) {
      if (err.message === 'SHARED_LIMIT' || err.message === 'NO_KEY') setAiError('Gündəlik 15 pulsuz limit doldu — 🎓 paneldən öz açarını əlavə et.')
      else if (err.message === 'BAD_KEY') setAiError('API açarı yanlışdır.')
      else if (err.message === 'RATE_LIMIT') setAiError('Bir az gözlə və yenidən cəhd et.')
      else if (err.message === 'NO_AUTH') setAiError('Sessiya bitib, yenidən daxil ol.')
      else setAiError('Xəta baş verdi.')
    } finally {
      setAiLoading(false)
    }
  }

  const current = questions[currentIdx]
  const selectedVocab = selected ? (vocabData as VocabItem[]).find(v => v.term === selected) : null
  const score = results.filter(Boolean).length
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

  // ─── Level seçim ekranı ───────────────────────────
  if (stage === 'select') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button onClick={() => router.push('/dashboard')} className="text-sm font-medium text-blue-600 hover:text-blue-800">🏠 Ana Səhifə</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Test Seç</h1>
        <p className="text-gray-500 mb-6 text-sm">Hər test 10 sualdan ibarətdir — cavab açarı ilə</p>

        <div className="space-y-3">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                level === l ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="font-semibold text-gray-900 dark:text-white">{l}</div>
              <div className="text-sm text-gray-500">
                {l === 'Foundation' && 'A2–B1 · Lüğət, True/False, Boşluq, Preposisiya'}
                {l === 'Higher'     && 'B2–C1 · Çoxlu Seçim, Cümlə Tamamlama'}
                {l === 'Advanced'   && 'C1–C2 · Hüquqi Doktrinalar, M&A, Müqavilə'}
              </div>
            </button>
          ))}
        </div>

        <button onClick={startQuiz} className="btn-primary w-full mt-6">
          Testi Başla →
        </button>
      </div>
    </div>
  )

  // ─── Nəticə ekranı ──────────────────────────────
  if (stage === 'result') return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {score} / {questions.length}
        </h2>
        <p className="text-gray-500 mb-4">{level} — {pct}% düzgün</p>

        <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
          <div
            className={`h-3 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setStage('select')} className="btn-secondary flex-1">Yenidən</button>
          <button onClick={() => router.push('/dashboard')} className="btn-primary flex-1">Ana Səhifə</button>
        </div>

        {/* Deliberate Practice — Zəif nöqtə analizi */}
        {weakPoints.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              🎯 Bu Həftə Fokuslanacaq Sahələr
            </h3>
            <div className="space-y-3">
              {weakPoints.map((wp) => (
                <div key={wp.topic} className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{wp.topic}</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{wp.errorRate}% xəta</span>
                  </div>
                  <p className="text-sm text-orange-800 dark:text-orange-200">💡 {wp.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ─── Quiz ekranı ────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => setStage('select')} className="text-gray-500">← Çıx</button>
        <div className="flex items-center gap-2">
          <span className={`badge text-white border-0 ${LEVEL_COLORS[level]}`}>{level}</span>
          <span className="text-sm text-gray-500">{currentIdx + 1} / {questions.length}</span>
        </div>
        <span className="text-sm text-green-600">✓ {results.filter(Boolean).length}</span>
      </header>

      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-blue-500 transition-all" style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {current && (
          <div>
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-gray-400 uppercase tracking-wide">{current.topic}</p>
                  {current.type && TYPE_BADGE[current.type] && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[current.type].cls}`}>
                      {TYPE_BADGE[current.type].label}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed whitespace-pre-line">
                  {current.question}
                </h2>
              </div>
              <ProfessorWidget
                mood={showAnswer ? (results[currentIdx] ? 'happy' : 'disappointed') : thinking ? 'thinking' : 'neutral'}
                message={
                  showAnswer
                    ? results[currentIdx]
                      ? feedbackMsg
                      : selectedVocab
                        ? `"${selected}" — ${selectedVocab.az_translation}`
                        : `Sən "${selected}" sözünü seçdin.`
                    : null
                }
              />
            </div>

            <div className="space-y-3 mb-6">
              {current.options.map((opt) => {
                const isCorrect = opt === current.correct
                const isSelected = opt === selected

                let cls = 'flex-1 p-3.5 rounded-xl border-2 text-left font-medium transition-all '
                if (!showAnswer) {
                  cls += 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                } else if (isCorrect) {
                  cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300'
                } else if (isSelected) {
                  cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300'
                } else {
                  cls += 'border-gray-200 dark:border-gray-700 opacity-50'
                }

                return (
                  <div key={opt} className="flex items-center gap-2">
                    <button onClick={() => handleSelect(opt)} className={cls}>
                      {isCorrect && showAnswer ? '✓ ' : isSelected && showAnswer ? '✗ ' : ''}{opt}
                    </button>
                    {/* Səsləndirmə — yalnız söz/termin variantlarında (T/F və təsnifatda gizli) */}
                    {current.type !== 'true-false' && current.type !== 'classification' && (
                      <AudioPlayer word={opt} variant="icon" />
                    )}
                  </div>
                )
              })}
            </div>

            {showAnswer && (
              <>
                {/* Affective Filter Feedback */}
                {feedbackMsg && (
                  <div className={`mb-4 p-4 rounded-xl text-center font-medium text-sm ${
                    results[currentIdx]
                      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {feedbackMsg}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 İzah:</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{current.explanation}</p>
                </div>

                {/* AI Müəllim — dərin izah */}
                {!aiExplanation && (
                  <button
                    onClick={askAiExplain}
                    disabled={aiLoading}
                    className="w-full mb-4 py-2.5 px-4 rounded-xl border-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {aiLoading ? '🎓 Müəllim düşünür...' : '🎓 AI Müəllim daha ətraflı izah etsin'}
                  </button>
                )}
                {aiError && <p className="text-center text-red-500 text-xs mb-4">{aiError}</p>}
                {aiExplanation && (
                  <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6">
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">🎓 AI Müəllim:</p>
                    <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">{aiExplanation}</p>
                  </div>
                )}
              </>
            )}

            {showAnswer && (
              <button onClick={nextQuestion} className="btn-primary w-full">
                {currentIdx + 1 >= questions.length ? 'Nəticəni gör →' : 'Növbəti sual →'}
              </button>
            )}
          </div>
        )}
      </main>
      <AITutorChat level={level} />
    </div>
  )
}
