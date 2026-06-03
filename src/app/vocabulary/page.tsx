'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getUser, getUserProfile, getDueCards, upsertVocabProgress, updateStreak } from '@/lib/supabase'
import { calculateNextReview, formatNextReview, SRS_DEFAULTS } from '@/lib/srs'
import { getRandomMessage, DOPAMINE_MESSAGES } from '@/lib/psychology'
import AudioPlayer from '@/components/AudioPlayer'
import OutputModal from '@/components/OutputModal'
import AITutorChat from '@/components/AITutorChat'
import vocabData from '@/data/vocab.json'
import type { VocabItem, VocabProgress, SRSQuality } from '@/types'

type CardState = 'front' | 'back'
type FeedbackType = 'success' | 'wrong'

export default function VocabularyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isReviewMode = searchParams.get('mode') === 'review' // gecə rejimi
  const [userId, setUserId] = useState<string | null>(null)
  const [userLevel, setUserLevel] = useState<string>('B1')
  const [dueCards, setDueCards] = useState<VocabProgress[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardState, setCardState] = useState<CardState>('front')
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null)
  const [outputCount, setOutputCount] = useState(0)
  const [showOutputModal, setShowOutputModal] = useState(false)

  useEffect(() => {
    async function init() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: prof } = await getUserProfile(user.id)
      if (prof) setUserLevel(prof.level)

      // Review rejimi: yalnız 10 kart (yeni kart yox)
      // Səhər rejimi: 20 kart (yeni + due)
      const limit = isReviewMode ? 10 : 20
      const { data: due } = await getDueCards(user.id, limit)

      if (!due || due.length === 0) {
        if (isReviewMode) {
          // Gecə review: due kart yoxdursa — tamamlanıb
          setDueCards([])
          setDone(true)
        } else {
          // Səhər: yeni istifadəçi — level-ə uyğun sözlərdən təsadüfi 20 söz seç
          const filtered = (vocabData as VocabItem[])
            .filter((v) => v.level === userLevel || v.level === 'F')
            .sort(() => Math.random() - 0.5)
            .slice(0, 20)
          const initialCards: VocabProgress[] = filtered.map((v) => ({
            user_id: user.id,
            vocab_id: v.id,
            ...SRS_DEFAULTS,
          }))
          setDueCards(initialCards)
        }
      } else {
        setDueCards(due as VocabProgress[])
      }
      setLoading(false)
    }
    init()
  }, [router, userLevel])

  const currentCard = dueCards[currentIndex]
  const currentVocab = currentCard
    ? (vocabData as VocabItem[]).find((v) => v.id === currentCard.vocab_id)
    : null

  async function handleQuality(quality: SRSQuality) {
    if (!userId || !currentCard || !currentVocab) return

    const result = calculateNextReview(
      quality,
      currentCard.interval,
      currentCard.ease_factor,
      currentCard.repetitions
    )

    await upsertVocabProgress({
      user_id: userId,
      vocab_id: currentCard.vocab_id,
      next_review: result.nextReview.toISOString(),
      interval: result.newInterval,
      ease_factor: result.newEaseFactor,
      repetitions: result.newRepetitions,
    })

    const isCorrect = quality >= 3
    setSessionStats((s) => ({
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
    }))

    // Affective Filter feedback
    setFeedbackMsg(getRandomMessage(isCorrect ? 'success' : 'wrong_answer'))
    setFeedbackType(isCorrect ? 'success' : 'wrong')

    // Output Mandatory — hər 3 kartdan sonra
    const newOutputCount = outputCount + 1
    setOutputCount(newOutputCount)

    // 2 saniye sonra sonrakı karta keç (yaxud output modal)
    setTimeout(() => {
      // Hər 3 kartdan sonra output modal
      if (newOutputCount % 3 === 0 && currentIndex + 1 < dueCards.length) {
        setShowOutputModal(true)
        return
      }

      if (currentIndex + 1 >= dueCards.length) {
        updateStreak(userId).then(() => setDone(true))
      } else {
        setCurrentIndex((i) => i + 1)
        setCardState('front')
        setFeedbackMsg(null)
        setFeedbackType(null)
      }
    }, 2000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>

  function handleOutputComplete() {
    setShowOutputModal(false)
    if (currentIndex + 1 >= dueCards.length) {
      if (userId) updateStreak(userId).then(() => setDone(true))
    } else {
      setCurrentIndex((i) => i + 1)
      setCardState('front')
      setFeedbackMsg(null)
      setFeedbackType(null)
    }
  }

  if (done) {
    const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 100
    const noCards = dueCards.length === 0 && isReviewMode
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-5xl mb-4">{noCards ? '✅' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isReviewMode ? '🌙 Gecə Review Tamamlandı!' : 'Sessiya Tamamlandı!'}
          </h2>
          {noCards && (
            <p className="text-gray-500 mb-4">Bu gün review ediləcək kart yoxdur. Yaxşı iş! 🎯</p>
          )}
          <p className="text-gray-500 mb-4">
            {sessionStats.correct} / {sessionStats.total} düzgün — {pct}%
          </p>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
            <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
            Dashboarda Qayıt
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Output Modal — Methodology: Mandatory Output */}
      {showOutputModal && currentVocab && (
        <OutputModal vocabWord={currentVocab} onComplete={handleOutputComplete} level={userLevel} />
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">← Geri</button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isReviewMode ? '🌙 Gecə Review' : '🌅 SRS Lüğət'}
        </span>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {dueCards.length} · ✓ {sessionStats.correct}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-blue-500 transition-all"
          style={{ width: `${((currentIndex) / dueCards.length) * 100}%` }}
        />
      </div>

      {/* Kart */}
      <main className="flex-1 flex items-center justify-center px-4">
        {currentVocab ? (
          <div className="w-full max-w-lg">
            {/* Ön üz */}
            <div
              className="card cursor-pointer text-center py-12 mb-4"
              onClick={() => setCardState('back')}
            >
              <div className="text-xs text-gray-400 mb-2">{currentVocab.topic}</div>

              {/* Audio — 4-Modal: Eşitmə */}
              <div className="mb-4 flex justify-center">
                <AudioPlayer word={currentVocab.term} variant="minimal" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {currentVocab.term}
              </h2>
              <p className="text-gray-500 italic">{currentVocab.pos}</p>

              {cardState === 'front' && (
                <p className="text-sm text-blue-500 mt-6">Cavabı görmək üçün karta bas</p>
              )}

              {cardState === 'back' && (
                <div className="mt-6 space-y-3 text-left border-t border-gray-100 dark:border-gray-800 pt-4">
                  <div className="space-y-1">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-gray-500">EN:</span> {currentVocab.en_def}
                    </p>
                    <AudioPlayer
                      word={currentVocab.en_def}
                      variant="sentence"
                      isSentence={true}
                    />
                  </div>
                  <p className="text-green-700 dark:text-green-400">
                    <span className="font-medium">AZ:</span> {currentVocab.az_translation}
                  </p>
                  {/* Nümunə cümlə + cümlə audio */}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 italic">"{currentVocab.en_example}"</p>
                    <AudioPlayer
                      word={currentVocab.en_example}
                      variant="sentence"
                      isSentence={true}
                    />
                  </div>
                  <p className="text-xs text-blue-600">🔗 {currentVocab.collocations}</p>
                </div>
              )}
            </div>

            {/* Qiymətləndirmə düymələri */}
            {cardState === 'back' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleQuality(0)}
                    disabled={feedbackMsg !== null}
                    className="py-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Unutdum
                  </button>
                  <button
                    onClick={() => handleQuality(3)}
                    disabled={feedbackMsg !== null}
                    className="py-3 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Çətin idi
                  </button>
                  <button
                    onClick={() => handleQuality(5)}
                    disabled={feedbackMsg !== null}
                    className="py-3 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Bildim ✓
                  </button>
                </div>

                {/* Affective Filter Feedback */}
                {feedbackMsg && (
                  <div className={`mt-4 p-4 rounded-xl text-center font-medium text-sm animate-bounce ${
                    feedbackType === 'success'
                      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {feedbackMsg}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Kart tapılmadı</p>
        )}
      </main>
      </div>
      <AITutorChat level={userLevel} />
    </>
  )
}
