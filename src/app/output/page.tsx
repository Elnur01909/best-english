'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, getUserProfile, saveQuizResult } from '@/lib/supabase'
import { checkWriting } from '@/lib/ai'
import { getRandomMessage } from '@/lib/psychology'
import AITutorChat from '@/components/AITutorChat'
import AudioPlayer from '@/components/AudioPlayer'
import { saveSessionScore } from '@/lib/sessionScore'
import vocabData from '@/data/vocab.json'
import quizData from '@/data/quizzes.json'
import type { VocabItem } from '@/types'

type Stage = 'quiz' | 'writing' | 'done'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function OutputPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userLevel, setUserLevel] = useState('B1')
  const [stage, setStage] = useState<Stage>('quiz')

  // Quiz state
  const [quizIdx, setQuizIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [quizResults, setQuizResults] = useState<boolean[]>([])
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null)

  // Writing state
  const [writingIdx, setWritingIdx] = useState(0)
  const [sentence, setSentence] = useState('')
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [writingDone, setWritingDone] = useState(false)

  // 5 quiz + 3 writing vocab seç
  const quizQuestions = useMemo(() =>
    shuffle(quizData as any[]).slice(0, 5).map((q: any) => ({
      ...q,
      options: shuffle(q.options),
    }))
  , [])

  const writingWords = useMemo(() =>
    shuffle(vocabData as VocabItem[]).slice(0, 3)
  , [])

  useEffect(() => {
    getUser().then((u) => {
      if (!u) { router.push('/login'); return }
      setUserId(u.id)
    })
    getUserProfile && getUser().then(async (u) => {
      if (!u) return
      const { data } = await getUserProfile(u.id)
      if (data?.level) setUserLevel(data.level)
    })
  }, [router])

  // ─── Quiz ───────────────────────────────────────────────
  const currentQ = quizQuestions[quizIdx]

  async function handleSelect(option: string) {
    if (selected) return
    setSelected(option)
    const correct = option === currentQ.correct
    const newResults = [...quizResults, correct]
    setQuizResults(newResults)
    setQuizFeedback(getRandomMessage(correct ? 'success' : 'wrong_answer'))
    // Dərhal score yaz — geri bassanı belə qalsın
    const currentScore = Math.round((newResults.filter(Boolean).length / quizQuestions.length) * 100)
    saveSessionScore('evening', currentScore)
    if (userId) {
      await saveQuizResult({ user_id: userId, quiz_id: currentQ.id, correct, time_taken: 0 })
    }
  }

  function nextQuiz() {
    if (quizIdx + 1 >= quizQuestions.length) {
      setStage('writing')
    } else {
      setQuizIdx((i) => i + 1)
      setSelected(null)
      setQuizFeedback(null)
    }
  }

  // ─── Writing ─────────────────────────────────────────────
  const currentWord = writingWords[writingIdx]

  async function checkWithAI() {
    if (!sentence.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const fb = await checkWriting(currentWord.term, currentWord.en_def, sentence, userLevel)
      setAiFeedback(fb)
      setWritingDone(true)
    } catch (err: any) {
      if (err.message === 'NO_KEY' || err.message === 'SHARED_LIMIT') {
        setAiError('AI limiti doldu. Öz pulsuz açarını 🎓 düyməsindən əlavə et.')
      } else {
        setAiError('Xəta baş verdi. Yenidən cəhd et.')
      }
    } finally {
      setAiLoading(false)
    }
  }

  function skipWriting() {
    nextWriting()
  }

  function nextWriting() {
    if (writingIdx + 1 >= writingWords.length) {
      const outputScore = Math.round((quizResults.filter(Boolean).length / quizQuestions.length) * 100)
      saveSessionScore('evening', outputScore)
      setStage('done')
    } else {
      setWritingIdx((i) => i + 1)
      setSentence('')
      setAiFeedback(null)
      setAiError(null)
      setWritingDone(false)
    }
  }

  const quizScore = quizResults.filter(Boolean).length

  // ─── Header ──────────────────────────────────────────────
  const header = (
    <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
      <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">← Geri</button>
      <span className="font-semibold text-gray-900 dark:text-white">🌆 Output Sessiyası</span>
      <span className="text-sm text-gray-400">
        {stage === 'quiz' ? `Quiz ${quizIdx + 1}/5` : stage === 'writing' ? `Yazma ${writingIdx + 1}/3` : '✓'}
      </span>
    </header>
  )

  // ─── Tamamlandı ──────────────────────────────────────────
  if (stage === 'done') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Output Tamamlandı!</h2>
          <p className="text-gray-500 mb-2">Quiz: <strong>{quizScore}/5</strong> düzgün</p>
          <p className="text-gray-500 mb-6">3 yazma məşqi tamamlandı ✓</p>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200 mb-6">
            💡 Output məşqi öyrənilən sözləri uzunmüddətli yaddaşa keçirir.
          </div>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
            Ana Səhifəyə Qayıt →
          </button>
        </div>
      </main>
    </div>
  )

  // ─── Yazma məşqi ─────────────────────────────────────────
  if (stage === 'writing') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header}

      {/* Progress */}
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-purple-500 transition-all" style={{ width: `${(writingIdx / writingWords.length) * 100}%` }} />
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Yazma Məşqi — Output</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            "{currentWord.term}" sözünü işlədərək cümlə yaz
          </h2>
          <p className="text-sm text-gray-500 mt-1">{currentWord.az_translation}</p>
          <p className="text-xs text-gray-400 mt-1 italic">{currentWord.en_def}</p>
        </div>

        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={`Məs: "The claimant relied on ${currentWord.term.toLowerCase()} to support the case."`}
          disabled={writingDone}
          className="input w-full resize-none mb-4"
          rows={4}
        />

        {aiFeedback && (
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl">
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">🎓 AI Müəllim:</p>
            <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">{aiFeedback}</p>
          </div>
        )}
        {aiError && <p className="text-red-500 text-xs mb-4">{aiError}</p>}

        <div className="flex gap-3">
          {!writingDone && (
            <button
              onClick={checkWithAI}
              disabled={!sentence.trim() || aiLoading}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl disabled:opacity-50"
            >
              {aiLoading ? '🎓 Yoxlanılır...' : '🎓 AI yoxlasın'}
            </button>
          )}
          <button
            onClick={writingDone ? nextWriting : skipWriting}
            className={`py-3 px-5 rounded-xl font-medium transition-colors ${
              writingDone
                ? 'flex-1 bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {writingDone
              ? writingIdx + 1 >= writingWords.length ? 'Bitir →' : 'Növbəti →'
              : 'Keç'}
          </button>
        </div>
      </main>
      <AITutorChat level={userLevel} />
    </div>
  )

  // ─── Quiz ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header}

      {/* Progress */}
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-blue-500 transition-all" style={{ width: `${(quizIdx / quizQuestions.length) * 100}%` }} />
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {currentQ && (
          <>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{currentQ.topic}</p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-relaxed">
              {currentQ.question}
            </h2>
            <div className="mb-6">
              <AudioPlayer word={currentQ.question} variant="sentence" isSentence={true} />
            </div>

            <div className="space-y-3 mb-6">
              {currentQ.options.map((opt: string) => {
                const isCorrect = opt === currentQ.correct
                const isSelected = opt === selected
                let cls = 'w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all '
                if (!selected) {
                  cls += 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                } else if (isCorrect) {
                  cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
                } else if (isSelected) {
                  cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                } else {
                  cls += 'border-gray-200 dark:border-gray-700 opacity-40'
                }
                return (
                  <button key={opt} onClick={() => handleSelect(opt)} className={cls}>
                    {selected && isCorrect ? '✓ ' : selected && isSelected ? '✗ ' : ''}{opt}
                  </button>
                )
              })}
            </div>

            {selected && (
              <>
                {quizFeedback && (
                  <div className={`mb-4 p-3 rounded-xl text-center text-sm font-medium ${
                    quizResults[quizResults.length - 1]
                      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {quizFeedback}
                  </div>
                )}
                {(() => {
                  // Düzgün cavaba uyğun vocab tap (AZ tərcümə üçün)
                  const vocab = (vocabData as VocabItem[]).find(
                    (v) => v.term.toLowerCase() === currentQ.correct.toLowerCase()
                  )
                  return (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 İzah (EN):</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{currentQ.explanation}</p>
                        <div className="mt-1.5">
                          <AudioPlayer word={currentQ.explanation} variant="sentence" isSentence={true} />
                        </div>
                      </div>
                      {vocab && (
                        <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">🇦🇿 Azərbaycanca:</p>
                          <p className="text-sm text-green-800 dark:text-green-300">{vocab.az_translation}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
                <button onClick={nextQuiz} className="btn-primary w-full">
                  {quizIdx + 1 >= quizQuestions.length ? 'Yazma məşqinə keç →' : 'Növbəti sual →'}
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
