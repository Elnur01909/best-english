'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AudioPlayer from '@/components/AudioPlayer'
import AITutorChat from '@/components/AITutorChat'
import readingData from '@/data/reading.json'

type Stage = 'text' | 'questions' | 'collocations' | 'done'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function ReadingPage() {
  const router = useRouter()

  // Hər dəfə random bir mətn seç
  const passage = useMemo(
    () => readingData[Math.floor(Math.random() * readingData.length)] as typeof readingData[0],
    []
  )
  const questions = useMemo(
    () => passage.questions.map(q => ({ ...q, options: shuffle(q.options) })),
    [passage]
  )
  const collocations = passage.collocations

  const [stage, setStage] = useState<Stage>('text')
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [qResults, setQResults] = useState<boolean[]>([])

  const [cIdx, setCIdx] = useState(0)
  const [cSelected, setCSelected] = useState<string | null>(null)
  const [cResults, setCResults] = useState<boolean[]>([])

  const current = questions[qIdx]
  const currentC = collocations[cIdx]

  function selectAnswer(opt: string) {
    if (selected) return
    setSelected(opt)
    setQResults(r => [...r, opt === current.correct])
  }

  function nextQuestion() {
    if (qIdx + 1 >= questions.length) {
      setStage('collocations')
    } else {
      setQIdx(i => i + 1)
      setSelected(null)
    }
  }

  function selectCollocation(opt: string) {
    if (cSelected) return
    setCSelected(opt)
    setCResults(r => [...r, opt === currentC.answer])
  }

  function nextCollocation() {
    if (cIdx + 1 >= collocations.length) {
      setStage('done')
    } else {
      setCIdx(i => i + 1)
      setCSelected(null)
    }
  }

  const qScore = qResults.filter(Boolean).length
  const cScore = cResults.filter(Boolean).length
  const total = questions.length + collocations.length
  const totalScore = qScore + cScore

  // ─── Header ──────────────────────────────────────────────
  const header = (title: string, progress: string) => (
    <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">← Geri</button>
      <span className="font-semibold text-gray-900 dark:text-white text-sm">☀️ {title}</span>
      <span className="text-sm text-gray-400">{progress}</span>
    </header>
  )

  // ─── Mətn oxuma ─────────────────────────────────────────
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

        {/* Mətn */}
        <div className="card mb-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {passage.text}
          </div>
          <div className="mt-4">
            <AudioPlayer word={passage.text} variant="sentence" isSentence={true} />
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-200">
          💡 Mətni diqqətlə oxu. Lazım gəlsə yenidən oxu — suallar sonra gəlir.
        </div>

        <button onClick={() => setStage('questions')} className="btn-primary w-full">
          Suallara keç → ({questions.length} sual)
        </button>
      </main>
      <AITutorChat level="B2" />
    </div>
  )

  // ─── Suallar ─────────────────────────────────────────────
  if (stage === 'questions') return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header('Oxu Anlama', `Sual ${qIdx + 1}/${questions.length}`)}
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-blue-500 transition-all" style={{ width: `${(qIdx / questions.length) * 100}%` }} />
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 leading-relaxed">
          {current.question}
        </h2>

        <div className="space-y-3 mb-6">
          {current.options.map((opt) => {
            const isCorrect = opt === current.correct
            const isSelected = opt === selected
            let cls = 'w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all '
            if (!selected) cls += 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
            else if (isCorrect) cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
            else if (isSelected) cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
            else cls += 'border-gray-200 dark:border-gray-700 opacity-40'
            return (
              <button key={opt} onClick={() => selectAnswer(opt)} className={cls}>
                {selected && isCorrect ? '✓ ' : selected && isSelected ? '✗ ' : ''}{opt}
              </button>
            )
          })}
        </div>

        {selected && (
          <>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 İzah:</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{current.explanation}</p>
            </div>
            <button onClick={nextQuestion} className="btn-primary w-full">
              {qIdx + 1 >= questions.length ? 'Kollokasiya məşqinə keç →' : 'Növbəti sual →'}
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
      {header('TOLES Kollokasiya', `${cIdx + 1}/${collocations.length}`)}
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-purple-500 transition-all" style={{ width: `${(cIdx / collocations.length) * 100}%` }} />
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Boşluğu doldurun</p>
        <div className="card mb-6">
          <p className="text-lg text-gray-900 dark:text-white leading-relaxed font-medium">
            {currentC.sentence.replace('___', '_______')}
          </p>
          <div className="mt-3">
            <AudioPlayer word={currentC.sentence.replace('___', currentC.answer)} variant="sentence" isSentence={true} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {shuffle(currentC.options).map((opt) => {
            const isCorrect = opt === currentC.answer
            const isSelected = opt === cSelected
            let cls = 'p-3 rounded-xl border-2 text-center font-medium transition-all '
            if (!cSelected) cls += 'border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950'
            else if (isCorrect) cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
            else if (isSelected) cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
            else cls += 'border-gray-200 dark:border-gray-700 opacity-40'
            return (
              <button key={opt} onClick={() => selectCollocation(opt)} className={cls}>
                {cSelected && isCorrect ? '✓ ' : cSelected && isSelected ? '✗ ' : ''}{opt}
              </button>
            )
          })}
        </div>

        {cSelected && (
          <button onClick={nextCollocation} className="btn-primary w-full">
            {cIdx + 1 >= collocations.length ? 'Nəticəni gör →' : 'Növbəti →'}
          </button>
        )}
      </main>
      <AITutorChat level="B2" />
    </div>
  )

  // ─── Nəticə ──────────────────────────────────────────────
  const pct = Math.round((totalScore / total) * 100)
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📖'}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Sessiya Tamamlandı!</h2>
        <p className="text-gray-500 mb-1">"{passage.title}"</p>
        <p className="text-sm text-gray-500 mb-4">
          Oxu anlama: <strong>{qScore}/{questions.length}</strong> · Kollokasiya: <strong>{cScore}/{collocations.length}</strong>
        </p>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-6">
          <div className={`h-3 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200 mb-6">
          💡 TOLES Reading hissəsi: həm anlama sualları, həm də dil istifadəsi (kollokasiya) yoxlanılır.
        </div>
        <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
          Dashboard-a qayıt →
        </button>
      </div>
    </div>
  )
}
