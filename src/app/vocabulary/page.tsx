'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getUser, getUserProfile, getDueCards, getSeenVocabIds, upsertVocabProgress, updateStreak, getMnemonic, saveMnemonic } from '@/lib/supabase'
import { generateMnemonic } from '@/lib/ai'
import { calculateNextReview, SRS_DEFAULTS } from '@/lib/srs'
import { getRandomMessage } from '@/lib/psychology'
import AudioPlayer from '@/components/AudioPlayer'
import OutputModal from '@/components/OutputModal'
import ProfessorWidget from '@/components/ProfessorWidget'
import AITutorChat from '@/components/AITutorChat'
import SpeakingPractice from '@/components/SpeakingPractice'
import { saveSessionScore } from '@/lib/sessionScore'
import { getDailyPlan } from '@/lib/curriculum'
import vocabData from '@/data/vocab.json'
import type { VocabItem, VocabProgress, SRSQuality } from '@/types'

const NEW_WORDS_PER_DAY = 8   // Bugünkü mövzudan yeni sözlər
const REVIEW_PER_DAY    = 4   // SM-2 review kartları
// Cəmi: 12 kart

// Fisher-Yates qarışdırma — sözlər həmişə eyni sıra ilə gəlməsin
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
  const [showExampleAz, setShowExampleAz] = useState(false)
  const [mnemonic, setMnemonic] = useState<string | null>(null)
  const [mnemonicLoading, setMnemonicLoading] = useState(false)
  const [mnemonicError, setMnemonicError] = useState(false)
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
        const shuffledDue = shuffle(due as VocabProgress[])
        setQueue(shuffledDue)
        setTotalUnique(shuffledDue.length)
        setLoading(false)
        return
      }

      // ─── HİBRİD SİSTEM ───────────────────────────────────────
      // 1) SM-2 review kartları (vaxtı gəlmiş — 4 kart)
      const { data: dueRaw } = await getDueCards(user.id, REVIEW_PER_DAY)
      const reviewCards = (dueRaw ?? []) as VocabProgress[]
      const reviewIds = new Set(reviewCards.map(c => c.vocab_id))

      // 2) Yeni sözlər — öyrənmə trekinə görə
      const savedTrack = typeof window !== 'undefined' ? localStorage.getItem('best_english_track') : null
      const profLevel = (prof?.level ?? 'A1') as string
      const track = savedTrack === 'general' || savedTrack === 'legal'
        ? savedTrack
        : (['A1', 'A2', 'B1'].includes(profLevel) ? 'general' : 'legal')

      let newVocabIds: number[]
      if (track === 'general') {
        // Ümumi trek: istifadəçinin CEFR səviyyəsinə uyğun, hələ görmədiyi sözlər
        const seen = await getSeenVocabIds(user.id)
        const pool = (vocabData as VocabItem[]).filter(v =>
          v.track === 'general' && v.cefr === profLevel &&
          !seen.has(v.id) && !reviewIds.has(v.id)
        )
        newVocabIds = shuffle(pool.map(v => v.id)).slice(0, NEW_WORDS_PER_DAY)
      } else {
        // Hüquqi trek: mövcud curriculum davranışı (dəyişmir)
        const plan = await getDailyPlan(user.id)
        const todayVocabIds = (plan.curriculum.vocab_ids ?? []) as number[]
        newVocabIds = shuffle(todayVocabIds.filter(id => !reviewIds.has(id))).slice(0, NEW_WORDS_PER_DAY)
      }
      const newCards: VocabProgress[] = newVocabIds
        .map(id => ({ user_id: user.id, vocab_id: id, ...SRS_DEFAULTS }))

      // 3) Birləşdir və hamısını qarışdır — sözlər həmişə eyni sıra ilə gəlməsin
      const combined = shuffle([...reviewCards, ...newCards])
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

  // Yeni kart gələndə tərcüməni və mnemonikanı sıfırla
  useEffect(() => {
    setShowExampleAz(false)
    setMnemonic(null)
    setMnemonicError(false)
  }, [qIdx])

  async function loadMnemonic() {
    if (!currentVocab || mnemonic || mnemonicLoading) return
    setMnemonicLoading(true)
    setMnemonicError(false)
    try {
      // 1) Əvvəlcə paylaşılan keşi yoxla — tapılsa AI çağırışı lazım deyil
      const { data: cached } = await getMnemonic(currentVocab.id)
      if (cached?.mnemonic_az) {
        setMnemonic(cached.mnemonic_az)
        return
      }
      // 2) Keşdə yoxdursa — AI ilə generasiya et və keşlə (bir dəfəlik, paylaşılan)
      const generated = await generateMnemonic(currentVocab.term, currentVocab.az_translation)
      setMnemonic(generated)
      saveMnemonic(currentVocab.id, generated).catch(() => {})
    } catch {
      setMnemonicError(true)
    } finally {
      setMnemonicLoading(false)
    }
  }

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
      consecutive_lapses: 0,
    })

    // Lokal queue-da da sıfırla — "leech" nişanı dərhal yenilənsin
    setQueue(prev => prev.map((c, i) => i === qIdx ? { ...c, consecutive_lapses: 0 } : c))

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
    const newLapses = (currentCard.consecutive_lapses ?? 0) + 1
    const isLeech = newLapses >= 4
    await upsertVocabProgress({
      user_id: userId, vocab_id: currentCard.vocab_id,
      next_review: result.nextReview.toISOString(),
      interval: result.newInterval, ease_factor: result.newEaseFactor, repetitions: result.newRepetitions,
      consecutive_lapses: newLapses,
    })

    const updatedCard = { ...currentCard, consecutive_lapses: newLapses }

    // Kart növbəyə geri qayıdır — "leech" sözlər daha tez (1-2 kart sonra), adilər 1-4 aralığında
    setQueue(prev => {
      const rem = prev.slice(qIdx + 1)
      const range = isLeech ? 2 : 4
      const at = Math.min(Math.floor(Math.random() * range) + 1, rem.length)
      const n = [...rem]
      n.splice(at, 0, updatedCard)
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

            {/* KART — flashcard kimi: əvvəl yalnız söz, "Tərcüməni göstər" ilə arxa üz açılır (aktiv yada salma) */}
            <div className="card text-center mb-6 relative">
              <ProfessorWidget
                className="absolute -top-4 right-1 sm:-right-6 z-10"
                mood={feedbackMsg ? (feedbackType === 'success' ? 'happy' : 'disappointed') : thinking ? 'thinking' : 'neutral'}
                message={feedbackMsg}
              />
              <div className="text-xs text-gray-400 mb-2">{currentVocab.topic}</div>
              {(currentCard?.consecutive_lapses ?? 0) >= 4 && (
                <div className="mb-3">
                  <div className="inline-block mb-2 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-[11px] font-semibold">
                    🔥 Çətin söz — {currentCard?.consecutive_lapses}x unuduldu, diqqətlə təkrarla
                  </div>
                  {!mnemonic && !mnemonicLoading && !mnemonicError && (
                    <div>
                      <button
                        onClick={loadMnemonic}
                        className="px-3 py-1.5 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors"
                      >
                        🧠 Yadda saxlama ipucu göstər
                      </button>
                    </div>
                  )}
                  {mnemonicLoading && (
                    <p className="text-xs text-gray-400">🧠 Mnemonika hazırlanır...</p>
                  )}
                  {mnemonicError && (
                    <p className="text-xs text-red-500">Mnemonika alınmadı — yenidən cəhd et.</p>
                  )}
                  {mnemonic && (
                    <div className="mt-1 p-3 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 text-left">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">🧠 Yadda saxlama ipucu:</p>
                      <p className="text-sm text-purple-800 dark:text-purple-200">{mnemonic}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Söz + audio + danışma */}
              <div className="mb-3 flex justify-center gap-3 flex-wrap">
                <AudioPlayer word={currentVocab.term} variant="minimal" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                {currentVocab.term}
              </h2>
              <p className="text-gray-400 italic text-sm mb-4">{currentVocab.pos}</p>

              {cardState === 'front' ? (
                /* ÖN ÜZ — aktiv yada salma: əvvəl yalnız söz görünür, tərcümə gizlidir */
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6 pb-1">
                  <p className="text-sm text-gray-400 mb-4">🧠 Mənasını yadına salmağa çalış, sonra aç...</p>
                  <button
                    onClick={() => setCardState('back')}
                    className="px-6 py-3 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold transition-colors"
                  >
                    🌐 Tərcüməni göstər
                  </button>
                </div>
              ) : (
                <>
                  {/* ARXA ÜZ — tərif, tərcümə, nümunələr */}
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
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-gray-500 italic">"{currentVocab.en_example}"</p>
                        <button
                          onClick={() => setShowExampleAz(v => !v)}
                          className="shrink-0 mt-0.5 h-6 px-2 rounded-full flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-400 transition-colors text-[11px] font-semibold"
                          title="Azərbaycan dilinə tərcümə et"
                          aria-label="Azərbaycan dilinə tərcümə et"
                        >
                          🌐 AZ
                        </button>
                      </div>
                      {showExampleAz && (
                        <p className="text-sm text-green-700 dark:text-green-400 italic">"{currentVocab.az_example}"</p>
                      )}
                      <AudioPlayer word={currentVocab.en_example} variant="sentence" isSentence={true} />
                    </div>
                    <p className="text-xs text-blue-600">🔗 {currentVocab.collocations}</p>
                    {/* Danışma məşqi */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                      <p className="text-xs text-gray-500 mb-1">🎤 Tələffüzü məşq et:</p>
                      <SpeakingPractice term={currentVocab.term} />
                    </div>
                  </div>

                  {/* Düymələr — yalnız tərcümə açıldıqdan sonra görünür */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
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
