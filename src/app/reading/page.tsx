'use client'
import { useMemo, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AudioPlayer from '@/components/AudioPlayer'
import AITutorChat from '@/components/AITutorChat'
import { saveSessionScore } from '@/lib/sessionScore'
import readingData from '@/data/reading.json'

type Stage = 'text' | 'questions' | 'collocations' | 'cloze' | 'done'

interface ClozeQ { sentence: string; answer: string; hint: string }

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Exact match + trim (leading/trailing space allowed, internal spaces = yanlış)
function checkAnswer(input: string, correct: string): boolean {
  const trimmed = input.trim()
  return trimmed === correct
}

function ReadingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const passageIdParam = searchParams.get('passageId')

  const passage = useMemo(() => {
    if (passageIdParam) {
      const found = (readingData as typeof readingData).find(p => p.id === Number(passageIdParam))
      if (found) return found
    }
    return readingData[Math.floor(Math.random() * readingData.length)] as typeof readingData[0]
  }, [passageIdParam])

  const questions = useMemo(
    () => passage.questions.map(q => ({ ...q, options: shuffle(q.options) })),
    [passage]
  )
  const collocations = passage.collocations
  const clozeList = (passage as any).cloze_questions as ClozeQ[] ?? []

  const TOTAL = questions.length + collocations.length + clozeList.length

  const [stage, setStage] = useState<Stage>('text')

  // ─── Questions ───────────────────────────────────────────
  const [qQueue, setQQueue] = useState(questions)
  const [qIdx, setQIdx] = useState(0)
  const [qSelected, setQSelected] = useState<string | null>(null)
  const [qMastered, setQMastered] = useState<Set<number>>(new Set())

  // ─── Collocations ────────────────────────────────────────
  const [cQueue, setCQueue] = useState(collocations)
  const [cIdx, setCIdx] = useState(0)
  const [cSelected, setCSelected] = useState<string | null>(null)
  const [cMastered, setCMastered] = useState<Set<number>>(new Set())

  // ─── Cloze ───────────────────────────────────────────────
  const [clQueue, setClQueue] = useState(clozeList.map((c, i) => ({ ...c, uid: i })))
  const [clIdx, setClIdx] = useState(0)
  const [clInput, setClInput] = useState('')
  const [clSubmitted, setClSubmitted] = useState(false)
  const [clCorrect, setClCorrect] = useState(false)
  const [clMastered, setClMastered] = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // Score: cəmi düzgün / TOTAL × 100 — dərhal yazılır
  function calcAndSave(qM: Set<number>, cM: Set<number>, clM: Set<number>) {
    const score = Math.round(((qM.size + cM.size + clM.size) / TOTAL) * 100)
    saveSessionScore('midday', score)
    return score
  }

  // ─── Question handlers ───────────────────────────────────
  const currentQ = qQueue[qIdx]

  function selectQ(opt: string) {
    if (qSelected) return
    setQSelected(opt)
    const correct = opt === currentQ.correct
    if (correct) {
      const next = new Set(qMastered); next.add(currentQ.id)
      setQMastered(next)
      calcAndSave(next, cMastered, clMastered)
    } else {
      // Yanlış — növbəti 1-3 yerə əlavə et
      setQQueue(prev => {
        const rem = prev.slice(qIdx + 1)
        const at = Math.min(Math.floor(Math.random() * 3) + 1, rem.length)
        const n = [...rem]; n.splice(at, 0, currentQ); return [...prev.slice(0, qIdx + 1), ...n]
      })
    }
  }

  function nextQ() {
    if (qMastered.size === questions.length) {
      setStage('collocations'); return
    }
    if (qIdx + 1 >= qQueue.length && qMastered.size === questions.length) {
      setStage('collocations'); return
    }
    setQIdx(i => i + 1); setQSelected(null)
  }

  // ─── Collocation handlers ────────────────────────────────
  const currentC = cQueue[cIdx]

  function selectC(opt: string) {
    if (cSelected) return
    setCSelected(opt)
    const correct = opt === currentC.answer
    if (correct) {
      const next = new Set(cMastered); next.add(cIdx)
      setCMastered(next)
      calcAndSave(qMastered, next, clMastered)
    } else {
      setCQueue(prev => {
        const rem = prev.slice(cIdx + 1)
        const at = Math.min(Math.floor(Math.random() * 3) + 1, rem.length)
        const n = [...rem]; n.splice(at, 0, currentC); return [...prev.slice(0, cIdx + 1), ...n]
      })
    }
  }

  function nextC() {
    if (cMastered.size === collocations.length) {
      if (clozeList.length > 0) { setStage('cloze') } else { setStage('done') }
      return
    }
    setCIdx(i => i + 1); setCSelected(null)
  }

  // ─── Cloze handlers ──────────────────────────────────────
  const currentCl = clQueue[clIdx]

  function submitCloze() {
    const correct = checkAnswer(clInput, currentCl.answer)
    setClSubmitted(true); setClCorrect(correct)
    if (correct) {
      const next = new Set(clMastered); next.add(currentCl.uid)
      setClMastered(next)
      calcAndSave(qMastered, cMastered, next)
    } else {
      setClQueue(prev => {
        const rem = prev.slice(clIdx + 1)
        const at = Math.min(Math.floor(Math.random() * 3) + 1, rem.length)
        const n = [...rem]; n.splice(at, 0, currentCl); return [...prev.slice(0, clIdx + 1), ...n]
      })
    }
  }

  function nextCl() {
    if (clMastered.size === clozeList.length) {
      setStage('done'); return
    }
    setClIdx(i => i + 1); setClInput(''); setClSubmitted(false); setClCorrect(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const totalMastered = qMastered.size + cMastered.size + clMastered.size
  const progressPct = Math.round((totalMastered / TOTAL) * 100)

  // ─── Header ──────────────────────────────────────────────
  const header = (title: string, sub: string) => (
    <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">← Geri</button>
      <span className="font-semibold text-gray-900 dark:text-white text-sm">☀️ {title}</span>
      <span className="text-sm text-gray-400">{sub}</span>
    </header>
  )

  const progressBar = (
    <div>
      <div className="h-2 bg-gray-200">
        <div className="h-2 bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="px-4 py-1 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex justify-between text-xs text-gray-500">
        <span>✓ Mənimsənildi: <strong className="text-green-600">{totalMastered}/{TOTAL}</strong></span>
        <span className="font-medium text-blue-600">{progressPct}%</span>
      </div>
    </div>
  )

  // ─── Mətn oxuma ──────────────────────────────────────────
  if (stage === 'text') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header('TOLES Oxu Anlama', passage.topic)}
      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
        <div className="mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            {passage.level} · {passage.topic}
          </span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">{passage.title}</h2>
        </div>
        <div className="card mb-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{passage.text}</div>
          <div className="mt-4"><AudioPlayer word={passage.text} variant="sentence" isSentence={true} /></div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-200">
          💡 Mətni diqqətlə oxu — suallar + boşluq doldurma gəlir. Hamısını düzgün bitirməlisən.
        </div>
        <div className="text-xs text-gray-500 mb-4 text-center">
          {questions.length} anlama sualı + {collocations.length} kollokasiya + {clozeList.length} cloze = cəmi {TOTAL} tapşırıq
        </div>
        <button onClick={() => setStage('questions')} className="btn-primary w-full">Başla → ({TOTAL} tapşırıq)</button>
      </main>
      <AITutorChat level="B2" />
    </div>
  )

  // ─── Anlama sualları ─────────────────────────────────────
  if (stage === 'questions') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header('Oxu Anlama', `Sual ${qMastered.size}/${questions.length} ✓`)}
      {progressBar}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 leading-relaxed">
          {currentQ?.question}
        </h2>
        <div className="space-y-3 mb-6">
          {currentQ?.options.map((opt: string) => {
            const isCorrect = opt === currentQ.correct
            const isSel = opt === qSelected
            let cls = 'w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all '
            if (!qSelected) cls += 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50'
            else if (isCorrect) cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800'
            else if (isSel) cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800'
            else cls += 'border-gray-200 opacity-40'
            return (
              <button key={opt} onClick={() => selectQ(opt)} className={cls}>
                {qSelected && isCorrect ? '✓ ' : qSelected && isSel ? '✗ ' : ''}{opt}
              </button>
            )
          })}
        </div>
        {qSelected && (
          <>
            <div className={`mb-4 p-3 rounded-xl text-sm text-center font-medium ${qSelected === currentQ?.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {qSelected === currentQ?.correct ? '✓ Düzgün!' : '✗ Yanlış — yenidən qarşına çıxacaq 🔄'}
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-blue-700 mb-1">💡 İzah:</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{currentQ?.explanation}</p>
            </div>
            <button onClick={nextQ} className="btn-primary w-full">
              {qMastered.size === questions.length ? 'Kollokasiyalara keç →' : 'Növbəti →'}
            </button>
          </>
        )}
      </main>
      <AITutorChat level="B2" />
    </div>
  )

  // ─── Kollokasiyalar ──────────────────────────────────────
  if (stage === 'collocations') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header('Kollokasiya', `${cMastered.size}/${collocations.length} ✓`)}
      {progressBar}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Boşluğu doldurun</p>
        <div className="card mb-6">
          <p className="text-lg text-gray-900 dark:text-white leading-relaxed font-medium">
            {currentC?.sentence.replace('___', '_______')}
          </p>
          <div className="mt-3">
            <AudioPlayer word={currentC?.sentence.replace(/___/g, '')} variant="sentence" isSentence={true} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {shuffle(currentC?.options ?? []).map((opt: string) => {
            const isCorrect = opt === currentC?.answer
            const isSel = opt === cSelected
            let cls = 'p-3 rounded-xl border-2 text-center font-medium transition-all '
            if (!cSelected) cls += 'border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50'
            else if (isCorrect) cls += 'border-green-400 bg-green-50 text-green-800'
            else if (isSel) cls += 'border-red-400 bg-red-50 text-red-800'
            else cls += 'border-gray-200 opacity-40'
            return (
              <button key={opt} onClick={() => selectC(opt)} className={cls}>
                {cSelected && isCorrect ? '✓ ' : cSelected && isSel ? '✗ ' : ''}{opt}
              </button>
            )
          })}
        </div>
        {cSelected && (
          <>
            <div className={`mb-4 p-3 rounded-xl text-sm text-center font-medium ${cSelected === currentC?.answer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {cSelected === currentC?.answer ? '✓ Düzgün!' : '✗ Yanlış — yenidən qarşına çıxacaq 🔄'}
            </div>
            <button onClick={nextC} className="btn-primary w-full">
              {cMastered.size === collocations.length ? (clozeList.length > 0 ? 'Cloze yazma →' : 'Nəticəyə →') : 'Növbəti →'}
            </button>
          </>
        )}
      </main>
      <AITutorChat level="B2" />
    </div>
  )

  // ─── Cloze (yazma məşqi) ─────────────────────────────────
  if (stage === 'cloze') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header('Cloze Yazma', `${clMastered.size}/${clozeList.length} ✓`)}
      {progressBar}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Mətndən götürülmüş cümlə — boşluğu tamamla</p>
        <div className="card mb-4">
          <p className="text-lg text-gray-900 dark:text-white leading-relaxed font-medium">
            {currentCl?.sentence.replace('___', '______')}
          </p>
          <p className="text-xs text-gray-400 mt-2">💬 İpucu: {currentCl?.hint}</p>
        </div>

        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={clInput}
            onChange={e => setClInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !clSubmitted && clInput.trim() && submitCloze()}
            disabled={clSubmitted}
            placeholder="Cavabı yaz..."
            className={`input w-full text-lg ${clSubmitted ? (clCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : ''}`}
            autoFocus
          />
          {clSubmitted && (
            <p className="text-xs text-gray-500 mt-1">
              Düzgün cavab: <strong className="text-green-700">{currentCl?.answer}</strong>
            </p>
          )}
        </div>

        {!clSubmitted ? (
          <button onClick={submitCloze} disabled={!clInput.trim()} className="btn-primary w-full">
            Yoxla →
          </button>
        ) : (
          <>
            <div className={`mb-4 p-3 rounded-xl text-sm text-center font-medium ${clCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {clCorrect
                ? '✓ Düzgün! Tam uyğundur.'
                : '✗ Yanlış — daxildə boşluq, artıq/çatışmayan hərf var. Yenidən qarşına çıxacaq 🔄'}
            </div>
            <button onClick={nextCl} className="btn-primary w-full">
              {clMastered.size === clozeList.length ? 'Nəticəyə →' : 'Növbəti →'}
            </button>
          </>
        )}
      </main>
      <AITutorChat level="B2" />
    </div>
  )

  // ─── Nəticə ──────────────────────────────────────────────
  const finalPct = Math.round((totalMastered / TOTAL) * 100)
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <div className="text-5xl mb-3">{finalPct >= 80 ? '🏆' : finalPct >= 60 ? '👍' : '📖'}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">TOLES Oxu Anlama</h2>
        <p className="text-3xl font-bold text-blue-600 mb-1">{totalMastered}/{TOTAL}</p>
        <p className="text-gray-500 mb-1">Mənimsənildi: <strong>{finalPct}%</strong></p>
        <p className="text-xs text-gray-400 mb-5">Günlük töhfə: {Math.round(finalPct * 25 / 100)}% (25%-dən)</p>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
          <div className={`h-3 rounded-full ${finalPct >= 80 ? 'bg-green-500' : finalPct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${finalPct}%` }} />
        </div>
        <div className="space-y-2 mb-6 text-left text-xs">
          <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span>Anlama sualları</span><strong>{qMastered.size}/{questions.length}</strong>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span>Kollokasiya</span><strong>{cMastered.size}/{collocations.length}</strong>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span>Cloze yazma</span><strong>{clMastered.size}/{clozeList.length}</strong>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">Ana Səhifəyə Qayıt →</button>
      </div>
    </div>
  )
}

export default function ReadingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>}>
      <ReadingContent />
    </Suspense>
  )
}
