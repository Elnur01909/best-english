'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getUser, supabase, saveQuizResult } from '@/lib/supabase'
import AudioPlayer from '@/components/AudioPlayer'
import WritingExercise from '@/components/WritingExercise'
import AITutorChat from '@/components/AITutorChat'
import ProfessorWidget from '@/components/ProfessorWidget'
import lessonsData from '@/data/lessons.json'
import vocabData from '@/data/vocab.json'
import quizData from '@/data/quizzes.json'
import type { Lesson, VocabItem, QuizQuestion } from '@/types'

// ─── 20 ən məşhur qaydasız feillər ──────────────────────
const IRREGULAR_VERBS = [
  { base: 'go',    past: 'went',    pp: 'gone',    az: 'getmək' },
  { base: 'come',  past: 'came',    pp: 'come',    az: 'gəlmək' },
  { base: 'have',  past: 'had',     pp: 'had',     az: 'olmaq / sahib olmaq' },
  { base: 'make',  past: 'made',    pp: 'made',    az: 'etmək / hazırlamaq' },
  { base: 'take',  past: 'took',    pp: 'taken',   az: 'götürmək / aparmaq' },
  { base: 'see',   past: 'saw',     pp: 'seen',    az: 'görmək' },
  { base: 'get',   past: 'got',     pp: 'got',     az: 'almaq / olmaq' },
  { base: 'know',  past: 'knew',    pp: 'known',   az: 'bilmək' },
  { base: 'think', past: 'thought', pp: 'thought', az: 'düşünmək' },
  { base: 'say',   past: 'said',    pp: 'said',    az: 'demək' },
  { base: 'give',  past: 'gave',    pp: 'given',   az: 'vermək' },
  { base: 'find',  past: 'found',   pp: 'found',   az: 'tapmaq' },
  { base: 'speak', past: 'spoke',   pp: 'spoken',  az: 'danışmaq' },
  { base: 'write', past: 'wrote',   pp: 'written', az: 'yazmaq' },
  { base: 'eat',   past: 'ate',     pp: 'eaten',   az: 'yemək' },
  { base: 'buy',   past: 'bought',  pp: 'bought',  az: 'satın almaq' },
  { base: 'run',   past: 'ran',     pp: 'run',     az: 'qaçmaq' },
  { base: 'begin', past: 'began',   pp: 'begun',   az: 'başlamaq' },
  { base: 'break', past: 'broke',   pp: 'broken',  az: 'sındırmaq / pozmaq' },
  { base: 'read',  past: 'read',    pp: 'read',    az: 'oxumaq' },
]

// ─── Qaydasız Feillər Modal ───────────────────────────────
function IrregularVerbsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Başlıq */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">📋 20 Ən Məşhur Qaydasız Feillər</h2>
            <p className="text-xs text-gray-400 mt-0.5">Base → Past Simple → Past Participle</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors text-lg font-bold"
            aria-label="Bağla"
          >
            ×
          </button>
        </div>

        {/* Cədvəl */}
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {/* Başlıq sətri */}
          <div className="grid grid-cols-4 gap-1 px-3 py-1.5 mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase">Base</span>
            <span className="text-xs font-bold text-blue-500 uppercase">Past</span>
            <span className="text-xs font-bold text-purple-500 uppercase">Participle</span>
            <span className="text-xs font-bold text-green-500 uppercase">Azərbaycanca</span>
          </div>

          <div className="space-y-1">
            {IRREGULAR_VERBS.map((v, i) => {
              // Növünü müəyyən et: A→A→A, A→B→A, A→B→C
              const sameAll = v.past === v.base && v.pp === v.base
              const samePastPP = v.past === v.pp
              const rowBg = sameAll
                ? 'bg-green-50 dark:bg-green-950/40'
                : samePastPP
                  ? 'bg-blue-50 dark:bg-blue-950/40'
                  : 'bg-gray-50 dark:bg-gray-800/40'
              return (
                <div key={v.base} className={`grid grid-cols-4 gap-1 px-3 py-2 rounded-lg ${rowBg}`}>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{v.base}</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{v.past}</span>
                  <span className="font-semibold text-purple-700 dark:text-purple-300 text-sm">{v.pp}</span>
                  <span className="text-green-700 dark:text-green-400 text-xs leading-tight">{v.az}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alt izah */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 dark:bg-green-950 inline-block" />A–A–A (eyni)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950 inline-block" />A–B–B (son iki eyni)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 inline-block" />A–B–C (hamısı fərqli)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Dərs → qrammatika mövzusu xəritəsi ─────────────────
const GRAMMAR_TOPIC: Record<number, string> = {
  28: 'Qrammatika · To be',
  29: 'Qrammatika · Articles a/an',
  30: 'Qrammatika · Plural nouns',
  31: 'Qrammatika · Subject pronouns',
  32: 'Qrammatika · Present Simple',
  33: "Qrammatika · Can / can't",
  34: 'Qrammatika · There is / There are',
  35: 'Qrammatika · Possessives',
  36: 'Qrammatika · was / were',
  37: 'Qrammatika · Past Simple',
  38: 'Qrammatika · Present Continuous',
  39: 'Qrammatika · Comparatives & Superlatives',
  40: 'Qrammatika · going to (future)',
  41: 'Qrammatika · some / any',
  42: 'Qrammatika · much / many',
  43: 'Qrammatika · Adverbs of frequency',
  44: 'Qrammatika · Present Perfect',
  45: 'Qrammatika · Present Perfect vs Past Simple',
  46: 'Qrammatika · Past Continuous',
  47: 'Qrammatika · will vs going to',
  48: 'Qrammatika · First Conditional',
  49: 'Qrammatika · Modals (should/must/might)',
  50: 'Qrammatika · Relative clauses',
  51: 'Qrammatika · Passive voice',
}

// True/False button labels
const TF_LABEL: Record<string, string> = { 'Doğru': 'True', 'Yanlış': 'False' }

// ─── Dərsə uyğun 12 sual seç ─────────────────────────────
function getLessonQuizzes(lesson: Lesson): QuizQuestion[] {
  const all = quizData as QuizQuestion[]
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)
  const shuffleOpts = (q: QuizQuestion) => ({ ...q, options: shuffle(q.options) })

  // ── Qrammatika dərsləri (A1 / A2 / B1) ──────────────────
  const grammarTopic = GRAMMAR_TOPIC[lesson.id]
  if (grammarTopic) {
    const grammarQs = shuffle(all.filter(q => q.topic === grammarTopic)).slice(0, 8)
    // 4 əlavə söz sualı — eyni cefr+track-dan
    const vocabQs = shuffle(
      all.filter(q => q.cefr === lesson.level && (q.track ?? 'legal') === 'general' && q.type !== 'grammar')
    ).slice(0, 4)
    return [...grammarQs, ...vocabQs].slice(0, 12).map(shuffleOpts)
  }

  // ── TOLES dərsləri (F / H / A) ───────────────────────────
  // Başlıqdan mövzuları çıxar: "Dərs 1: Contract Law, Tort Law, ..."
  const topicStr = lesson.title.split(':')[1] ?? ''
  const topics = topicStr.split(',').map(t => t.trim()).filter(Boolean)

  const pool = all.filter(q =>
    topics.some(t => q.topic === t) && (q.track ?? 'legal') === 'legal'
  )

  // Müxtəlif tiplərdən 2-şər götür
  const byType: Record<string, QuizQuestion[]> = {}
  shuffle(pool).forEach(q => {
    const t = q.type ?? 'definition'
    if (!byType[t]) byType[t] = []
    byType[t].push(q)
  })

  const result: QuizQuestion[] = []
  const types = Object.keys(byType)
  // Hər tipdən maksimum götür, cəmi 12-yə çatana qədər
  for (let round = 0; result.length < 12; round++) {
    let added = 0
    for (const t of types) {
      if (result.length >= 12) break
      if (byType[t][round]) { result.push(byType[t][round]); added++ }
    }
    if (added === 0) break
  }

  return result.slice(0, 12).map(shuffleOpts)
}

// ─── Səhifə ──────────────────────────────────────────────
type Stage = 'lesson' | 'quiz' | 'done'

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const lesson = (lessonsData as Lesson[]).find((l) => l.id === id)

  const [userId, setUserId] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([])
  const [showIrregular, setShowIrregular] = useState(false)

  // ── Quiz state ───────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('lesson')
  const [lessonQs, setLessonQs] = useState<QuizQuestion[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [qSelected, setQSelected] = useState<string | null>(null)
  const [qShowAnswer, setQShowAnswer] = useState(false)
  const [qResults, setQResults] = useState<boolean[]>([])
  const [startTime, setStartTime] = useState(0)

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('user_lesson_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('lesson_id', id)
        .single()

      if (data?.completed) setCompleted(true)

      if (lesson?.terms) {
        const items = (vocabData as VocabItem[]).filter((v) => lesson.terms.includes(v.id))
        setVocabItems(items)
      }
    }
    load()
  }, [router, id, lesson])

  // Dərsi tamamla düyməsi → quiz başlat
  function startLessonQuiz() {
    if (!lesson) return
    const qs = getLessonQuizzes(lesson)
    setLessonQs(qs)
    setQIdx(0)
    setQResults([])
    setQSelected(null)
    setQShowAnswer(false)
    setStartTime(Date.now())
    setStage('quiz')
  }

  // Quiz cavabı seç
  async function handleQSelect(option: string) {
    if (qShowAnswer) return
    setQSelected(option)
    setQShowAnswer(true)
    const q = lessonQs[qIdx]
    const correct = option === q.correct
    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    if (userId) {
      await saveQuizResult({ user_id: userId, quiz_id: q.id, correct, time_taken: timeTaken })
    }
    setQResults(r => [...r, correct])
  }

  // Növbəti sual
  async function nextQ() {
    if (qIdx + 1 >= lessonQs.length) {
      // Bütün suallar bitdi → dərsi tamamla
      if (userId && !completed) {
        await supabase.from('user_lesson_progress').upsert({
          user_id: userId, lesson_id: id,
          completed: true, completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' })
        setCompleted(true)
      }
      setStage('done')
    } else {
      setQIdx(i => i + 1)
      setQSelected(null)
      setQShowAnswer(false)
      setStartTime(Date.now())
    }
  }

  if (!lesson) return <div className="p-8 text-center text-gray-500">Dərs tapılmadı</div>

  const score = qResults.filter(Boolean).length
  const pct = lessonQs.length > 0 ? Math.round((score / lessonQs.length) * 100) : 0
  const current = lessonQs[qIdx]

  // ── Tamamlama ekranı ──────────────────────────────────────
  if (stage === 'done') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {score} / {lessonQs.length}
        </h2>
        <p className="text-gray-500 mb-2">{lesson.title}</p>
        <p className="text-sm font-medium mb-4 text-green-600">✓ Dərs tamamlandı!</p>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
          <div
            className={`h-3 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/lessons')} className="btn-secondary flex-1">
            ← Dərslər
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn-primary flex-1">
            🏠 Ana Səhifə
          </button>
        </div>
      </div>
    </div>
  )

  // ── Quiz ekranı ───────────────────────────────────────────
  if (stage === 'quiz' && current) {
    const displayLabel = (opt: string) =>
      current.type === 'true-false' ? (TF_LABEL[opt] ?? opt) : opt
    const isLong = current.type === 'matching' || current.type === 'sentence' || current.type === 'true-false'

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setStage('lesson')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              ← Geri
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors text-sm font-medium"
            >
              🏠 Ana Səhifə
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">Dərs testi · {qIdx + 1} / {lessonQs.length}</span>
              <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full">
                ✓ {qResults.filter(Boolean).length}
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-blue-500 rounded-full transition-all"
              style={{ width: `${(qIdx / lessonQs.length) * 100}%` }}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
          {/* Sual */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wide">{current.topic}</span>
              <AudioPlayer
                word={current.question.match(/«([^»]+)»/)?.[1] ?? current.question}
                isSentence={!current.question.match(/«([^»]+)»/)}
                variant="icon"
              />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed whitespace-pre-line">
              {current.question}
            </h2>
          </div>

          {/* Variantlar */}
          <div className="space-y-3 mb-6">
            {current.options.map((opt) => {
              const isCorrect = opt === current.correct
              const isSelected = opt === qSelected
              let cls = 'flex-1 p-3.5 rounded-xl border-2 text-left font-medium transition-all '
              if (!qShowAnswer) {
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
                  <button onClick={() => handleQSelect(opt)} className={cls}>
                    {isCorrect && qShowAnswer ? '✓ ' : isSelected && qShowAnswer ? '✗ ' : ''}
                    {displayLabel(opt)}
                  </button>
                  <AudioPlayer word={displayLabel(opt)} isSentence={isLong} variant="icon" />
                </div>
              )
            })}
          </div>

          {/* İzah */}
          {qShowAnswer && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 İzah:</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{current.explanation}</p>
            </div>
          )}

          {qShowAnswer && (
            <button onClick={nextQ} className="btn-primary w-full">
              {qIdx + 1 >= lessonQs.length ? '✓ Dərsi Tamamla →' : 'Növbəti Sual →'}
            </button>
          )}
        </main>
      </div>
    )
  }

  // ── Dərs mətni ekranı ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Qaydasız feillər üzən pəncərəsi */}
      {showIrregular && <IrregularVerbsModal onClose={() => setShowIrregular(false)} />}
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/lessons')} className="text-gray-500">← Geri</button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Dərs {lesson.id} · {lesson.level}</p>
            <h1 className="font-bold text-gray-900 dark:text-white truncate">{lesson.title}</h1>
          </div>
          {completed && <span className="badge bg-green-100 text-green-700 shrink-0">✓ Tamamlandı</span>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hədəflər + Professor */}
        <div className="card bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 relative">
          <ProfessorWidget
            className="absolute -top-4 right-1 sm:-right-6 z-10"
            mood={completed ? 'happy' : 'neutral'}
            message={completed
              ? 'Əla! Bu dərsi tamamladın 🎉'
              : 'Sözləri oxu, dinlə və yadda saxla 📚'}
          />
          <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">🎯 Öyrənmə Hədəfləri</h3>
          <ul className="space-y-2">
            {lesson?.objectives?.map((o, i) => (
              <li key={i} className="text-sm text-blue-800 dark:text-blue-200">✓ {o}</li>
            ))}
          </ul>
        </div>

        {/* İzah (qrammatika / mətn dərsləri üçün) */}
        {lesson.content && lesson.content.length > 40 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white">📖 İzah</h2>
              {/* Qaydasız feillər cədvəli düyməsi — yalnız Past Simple dərsi (id 37) */}
              {lesson.id === 37 && (
                <button
                  onClick={() => setShowIrregular(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
                >
                  📋 Nümunə Cədvəli
                </button>
              )}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{lesson.content}</div>
          </div>
        )}

        {/* Lüğət */}
        {vocabItems.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">📚 Dərsin Lüğəti</h2>
            <div className="space-y-4">
              {vocabItems.map((v) => (
                <div key={v.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-gray-900 dark:text-white">{v.term}</div>
                    <AudioPlayer word={v.term} variant="minimal" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{v.en_def}</div>
                    <AudioPlayer word={v.en_def} variant="sentence" isSentence={true} />
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-400 mt-1 italic">{v.az_translation}</div>
                  <div className="text-xs text-gray-400 mt-2">🔗 {v.collocations}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yazma Məşqi */}
        {vocabItems.length > 0 && (
          <WritingExercise
            word={vocabItems[0].term}
            definition={vocabItems[0].en_def}
            optional={true}
            level={lesson?.level ?? 'B1'}
          />
        )}

        {/* Tamamlama düyməsi */}
        {!completed ? (
          <button onClick={startLessonQuiz} className="btn-primary w-full">
            ✍️ Dərsi Test Et (12 sual) →
          </button>
        ) : (
          <div className="card text-center py-4">
            <div className="text-2xl mb-2">🎉</div>
            <p className="text-green-600 font-medium">Bu dərsi tamamladın!</p>
            <button onClick={startLessonQuiz} className="mt-3 text-sm text-blue-600 hover:underline">
              Yenidən test et →
            </button>
          </div>
        )}
      </main>
      <AITutorChat level={lesson?.level ?? 'B1'} />
    </div>
  )
}
