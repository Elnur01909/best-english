'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getUser, getUserProfile, getDueCards, upsertVocabProgress, updateStreak } from '@/lib/supabase'
import { calculateNextReview, SRS_DEFAULTS } from '@/lib/srs'
import { getRandomMessage } from '@/lib/psychology'
import AudioPlayer from '@/components/AudioPlayer'
import OutputModal from '@/components/OutputModal'
import ProfessorWidget from '@/components/ProfessorWidget'
import AITutorChat from '@/components/AITutorChat'
import { saveSessionScore } from '@/lib/sessionScore'
import { getDailyPlan } from '@/lib/curriculum'
import vocabData from '@/data/vocab.json'
import type { VocabItem, VocabProgress, SRSQuality } from '@/types'

const NEW_WORDS_PER_DAY = 8   // Bugünkü mövzudan yeni sözlər
const REVIEW_PER_DAY    = 4   // SM-2 review kartları
// Cəmi: 12 kart

type CardState = 'front' | 'back'
type FeedbackType = 'success' | 'wrong'

function VocabularyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isReviewMode = searchParams.get('mode') === 'review'
  const [userId, setUserId] = useState<string | null>(null)
  const [userLevel, setUserLevel] = useState<string>('B1')
  // Queue-based sistem: yanlış kartlar geri qayıdır
  const [queue, setQueue] = useState<VocabProgress[]>([])
  const [totalUnique, setTotalUnique] = useState(0)
  const [qIdx, setQIdx] = useState(0)
  const [mastered, setMastered] = useState<Set<number>>(new Set())
  const [cardState, setCardState] = useState<CardState>('front')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null)
  const [outputCount, setOutputCount] = useState(0)
  const [showOutputModal, setShowOutputModal] = useState(false)
  const [thinking, setThinking] = useState(false)
  // köhnə compat
  const dueCards = queue
  const currentIndex = qIdx

  useEffect(() => {
    async function init() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: prof } = await getUserProfile(user.id)
      if (prof) setUserLevel(prof.level)

      // Review rejimi: yalnız 10 kart (yeni kart yox)
      // Səhər rejimi: 20 kart (yeni + due)
      if (isReviewMode) {
        // Gecə rejimi: yalnız SM-2 review
        const { data: due } = await getDueCards(user.id, 10)
        if (!due || due.length === 0) { setDone(true); setLoading(false); return }
        setQueue(due as VocabProgress[])
        setTotalUnique(due.length)
        setLoading(false)
        return
      }

      // ─── HİBRİD SİSTEM ───────────────────────────────────────
      // 1) SM-2 review kartları (vaxtı gəlmiş — 4 kart)
      const { data: dueRaw } = await getDueCards(user.id, REVIEW_PER_DAY)
      const reviewCards = (dueRaw ?? []) as VocabProgress[]
      const reviewIds = new Set(reviewCards.map(c => c.vocab_id))

      // 2) Bugünkü mətndən 8 əsas termin (curriculum.vocab_ids)
      const plan = await getDailyPlan(user.id)
      const todayVocabIds = (plan.curriculum.vocab_ids ?? []) as number[]

      // Review-da olanları çıxart, qalan sözləri tap
      const newVocabIds = todayVocabIds.filter(id => !reviewIds.has(id))
      const newCards: VocabProgress[] = newVocabIds
        .slice(0, NEW_WORDS_PER_DAY)
        .map(id => ({ user_id: user.id, vocab_id: id, ...SRS_DEFAULTS }))

      // 3) Birləşdir: əvvəl review (4), sonra bugünkü mətndən (8)
      const combined = [...reviewCards, ...newCards]
      setQueue(combined)
      setTotalUnique(combined.length)
      setLoading(false)
    }
    init()
  }, [router, userLevel])

  const currentCard = queue[qIdx]
  const currentVocab = currentCard
    ? (vocabData as VocabItem[]).find((v) => v.id === currentCard.vocab_id)
    : null

  const progressPct = totalUnique > 0 ? Math.round((mastered.size / totalUnique) * 100) : 0

  // Gec cavab verəndə professor "düşünməyə" başlasın
  useEffect(() => {
    setThinking(false)
    if (feedbackMsg || !currentCard) return
    const t = setTimeout(() => setThinking(true), 8000)
    return () => clearTimeout(t)
  }, [qIdx, cardState, feedbackMsg, currentCard])

  async function handleBildim() {
    if (!userId || !currentCard || !currentVocab) return

    // SRS: uzun interval
    const result = calculateNextReview(5, currentCard.interval, currentCard.ease_factor, currentCard.repetitions)
    await upsertVocabProgress({
      user_id: userId, vocab_id: currentCard.vocab_id,
      next_review: result.nextReview.toISOString(),
      interval: result.newInterval, ease_factor: result.newEaseFactor, repetitions: result.newRepetitions,
    })

    // Mənimsənildi
    const next = new Set(mastered); next.add(currentCard.vocab_id)
    setMastered(next)
    const score = Math.round((next.size / totalUnique) * 100)
    saveSessionScore('morning', score)

    setFeedbackMsg(getRandomMessage('success'))
    setFeedbackType('success')

    const newOutputCount = outputCount + 1
    setOutputCount(newOutputCount)

    setTimeout(() => {
      if (newOutputCount % 3 === 0 && qIdx + 1 < queue.length) {
        setShowOutputModal(true); return
      }
      if (next.size === totalUnique) {
        saveSessionScore('morning', 100)
        if (userId) updateStreak(userId).then(() => setDone(true))
      } else {
        setQIdx(i => i + 1)
        setCardState('front')
        setFeedbackMsg(null)
        setFeedbackType(null)
      }
    }, 1500)
  }

  async function handleUnutdum() {
    if (!userId || !currentCard || !currentVocab) return

    // SRS: qısa interval (tezliklə yenidən göstər)
    const result = calculateNextReview(0, currentCard.interval, currentCard.ease_factor, currentCard.repetitions)
    await upsertVocabProgress({
      user_id: userId, vocab_id: currentCard.vocab_id,
      next_review: result.nextReview.toISOString(),
      interval: result.newInterval, ease_factor: result.newEaseFactor, repetitions: result.newRepetitions,
    })

    // Kart növbənin random yerinə (1-4 kart sonraya) əlavə et
    setQueue(prev => {
      const rem = prev.slice(qIdx + 1)
      const at = Math.min(Math.floor(Math.random() * 4) + 1, rem.length)
      const n = [...rem]
      n.splice(at, 0, currentCard)
      return [...prev.slice(0, qIdx + 1), ...n]
    })

    setFeedbackMsg(getRandomMessage('wrong_answer'))
    setFeedbackType('wrong')

    setTimeout(() => {
      setQIdx(i => i + 1)
      setCardState('front')
      setFeedbackMsg(null)
      setFeedbackType(null)
    }, 1500)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>

  function handleOutputComplete() {
    setShowOutputModal(false)
    if (mastered.size === totalUnique) {
      saveSessionScore('morning', 100)
      if (userId) updateStreak(userId).then(() => setDone(true))
    } else {
      setQIdx(i => i + 1)
      setCardState('front')
      setFeedbackMsg(null)
      setFeedbackType(null)
    }
  }

  if (done) {
    const noCards = queue.length === 0 && isReviewMode
    const finalPct = noCards ? 100 : Math.round((mastered.size / Math.max(totalUnique, 1)) * 100)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-5xl mb-4">{noCards ? '✅' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isReviewMode ? '🌙 Review Tamamlandı!' : 'SRS Sessiyası Tamamlandı!'}
          </h2>
          {noCards
            ? <p className="text-gray-500 mb-4">Bu gün review ediləcək kart yoxdur. Yaxşı iş! 🎯</p>
            : <p className="text-gray-500 mb-4">Mənimsənildi: <strong>{mastered.size} / {totalUnique}</strong> — {finalPct}%</p>
          }
          <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
            <div className={`h-3 rounded-full ${finalPct >= 80 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${finalPct}%` }} />
          </div>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
            Ana Səhifəyə Qayıt
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
        <button onClick={() => router.push('/dashboard')} className="text-sm font-medium text-blue-600 hover:text-blue-800">🏠 Ana Səhifə</button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isReviewMode ? '🌙 Review' : '🌅 SRS Lüğət'}
        </span>
        <span className="text-sm text-gray-500">✓ {mastered.size}/{totalUnique}</span>
      </header>

      {/* Progress bar — mənimsənilən/cəmi */}
      <div className="h-2 bg-gray-200">
        <div className="h-2 bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Kart */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {currentVocab ? (
          <div className="w-full max-w-lg">

            {/* KART — həmişə açıq, hər iki tərəf görsənir */}
            <div className="card text-center mb-6 relative">
              <ProfessorWidget
                className="absolute -top-4 right-1 sm:-right-6 z-10"
                mood={feedbackMsg ? (feedbackType === 'success' ? 'happy' : 'disappointed') : thinking ? 'thinking' : 'neutral'}
                message={feedbackMsg}
              />
              <div className="text-xs text-gray-400 mb-2">{currentVocab.topic}</div>

              {/* Söz + audio + danışma */}
              <div className="mb-3 flex justify-center gap-3 flex-wrap">
                <AudioPlayer word={currentVocab.term} variant="minimal" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                {currentVocab.term}
              </h2>
              <p className="text-gray-400 italic text-sm mb-4">{currentVocab.pos}</p>

              {/* Ayırıcı */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3 text-left">
                <div className="space-y-1">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    <span className="font-medium text-gray-500">EN:</span> {currentVocab.en_def}
                  </p>
                  <AudioPlayer word={currentVocab.en_def} variant="sentence" isSentence={true} />
                </div>
                <p className="text-green-700 dark:text-green-400 text-sm">
                  <span className="font-medium">AZ:</span> {currentVocab.az_translation}
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 italic">"{currentVocab.en_example}"</p>
                  <AudioPlayer word={currentVocab.en_example} variant="sentence" isSentence={true} />
                </div>
                <p className="text-xs text-blue-600">🔗 {currentVocab.collocations}</p>
              </div>
            </div>

            {/* Düymələr — həmişə görünür */}
            {(
              <>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleUnutdum}
                    disabled={feedbackMsg !== null}
                    className="py-5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-lg transition-colors disabled:opacity-50"
                  >
                    ✗ Unuduram
                  </button>
                  <button
                    onClick={handleBildim}
                    disabled={feedbackMsg !== null}
                    className="py-4 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 font-semibold text-base transition-colors disabled:opacity-50"
                  >
                    ✓ Bilirəm
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

export default function VocabularyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>}>
      <VocabularyContent />
    </Suspense>
  )
}
