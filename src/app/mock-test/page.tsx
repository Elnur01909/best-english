'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AITutorChat from '@/components/AITutorChat'
import vocabData from '@/data/vocab.json'
import quizData from '@/data/quizzes.json'
import type { VocabItem } from '@/types'

// TOLES Mock Mini-Test: 10 sual — lüğət + qrammatika + kollokasiya

interface MockQ {
  id: number
  type: 'vocabulary' | 'grammar' | 'collocation'
  question: string
  options: string[]
  correct: string
  explanation: string
  topic: string
}

// Sabit kollokasiya sualları
const COLLOCATION_QUESTIONS: MockQ[] = [
  { id: 2001, type: 'collocation', topic: 'Contract Law', question: 'The parties agreed to ___ into a legally binding contract.', options: ['enter', 'go', 'put', 'set'], correct: 'enter', explanation: '"Enter into a contract" is the standard legal collocation meaning to become party to a contract.' },
  { id: 2002, type: 'collocation', topic: 'Tort Law', question: 'The defendant was found ___ for the damage caused by his negligence.', options: ['liable', 'guilty', 'responsible of', 'blamed'], correct: 'liable', explanation: '"Liable for" is the correct collocation in tort law — it means legally responsible.' },
  { id: 2003, type: 'collocation', topic: 'Court & Litigation', question: 'The claimant decided to ___ a claim against the defendant for breach of contract.', options: ['bring', 'make', 'put', 'raise of'], correct: 'bring', explanation: '"Bring a claim" is the standard legal collocation for initiating legal proceedings.' },
  { id: 2004, type: 'collocation', topic: 'Company Law', question: 'The board of directors must act ___ the best interests of the company.', options: ['in', 'for', 'on', 'within'], correct: 'in', explanation: '"Act in the best interests" is the standard collocation for directors\' fiduciary duty.' },
  { id: 2005, type: 'collocation', topic: 'Criminal Law', question: 'The defendant entered a ___ of guilty at the first hearing.', options: ['plea', 'claim', 'statement of', 'declaration'], correct: 'plea', explanation: '"Enter a plea" is the correct collocation — the defendant formally states their plea in court.' },
  { id: 2006, type: 'collocation', topic: 'Contract Law', question: 'The seller was held ___ breach of contract for failing to deliver on time.', options: ['in', 'for', 'of', 'under'], correct: 'in', explanation: '"In breach of contract" is the standard legal phrase meaning the contract terms have not been met.' },
  { id: 2007, type: 'collocation', topic: 'Court & Litigation', question: 'The court granted an injunction to ___ the defendant from continuing the activity.', options: ['restrain', 'stop of', 'prevent of', 'block'], correct: 'restrain', explanation: '"Restrain" is the verb typically used in injunctions — "restrain the defendant from..."' },
  { id: 2008, type: 'collocation', topic: 'Criminal Law', question: 'The jury returned a ___ of not guilty after two days of deliberation.', options: ['verdict', 'decision of', 'judgment', 'ruling'], correct: 'verdict', explanation: '"Return a verdict" is the standard collocation for the jury\'s decision in a criminal trial.' },
  { id: 2009, type: 'collocation', topic: 'Employment Law', question: 'The employee was awarded compensation for ___ dismissal by the employment tribunal.', options: ['unfair', 'wrong', 'illegal', 'bad'], correct: 'unfair', explanation: '"Unfair dismissal" is the legal term for termination without fair reason under the Employment Rights Act 1996.' },
  { id: 2010, type: 'collocation', topic: 'Contract Law', question: 'The parties reached a ___ out of court, avoiding the need for a full trial.', options: ['settlement', 'decision', 'agreement of', 'deal'], correct: 'settlement', explanation: '"Reach a settlement" means the parties resolve their dispute without going to trial.' },
  { id: 2011, type: 'collocation', topic: 'Property Law', question: 'The bank placed a ___ on the property to secure the outstanding loan.', options: ['lien', 'charge of', 'hold', 'block'], correct: 'lien', explanation: '"Place a lien on" means to create a legal right over another\'s property as security for a debt.' },
  { id: 2012, type: 'collocation', topic: 'Criminal Law', question: 'The accused was acquitted of all ___ after the prosecution failed to prove its case.', options: ['charges', 'claims', 'accusations of', 'counts'], correct: 'charges', explanation: '"Acquitted of all charges" is the standard legal phrase when a defendant is found not guilty.' },
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildQuestions(): MockQ[] {
  const allQuiz = quizData as any[]
  const allVocab = vocabData as VocabItem[]

  // 4 vocab (definition → term)
  const vocabQs: MockQ[] = shuffle(allVocab).slice(0, 4).map(v => ({
    id: v.id,
    type: 'vocabulary' as const,
    topic: v.topic,
    question: v.en_def,
    options: shuffle([
      v.term,
      ...shuffle(allVocab.filter(x => x.id !== v.id && x.topic === v.topic)).slice(0, 3).map(x => x.term)
    ]),
    correct: v.term,
    explanation: `${v.term}: ${v.az_translation}`,
  }))

  // 2 grammar (quiz-dən)
  const grammarQs: MockQ[] = shuffle(allQuiz).slice(0, 2).map(q => ({
    id: q.id + 1000,
    type: 'grammar' as const,
    topic: q.topic,
    question: q.question,
    options: shuffle(q.options),
    correct: q.correct,
    explanation: q.explanation,
  }))

  // 4 collocation
  const collocationQs: MockQ[] = shuffle(COLLOCATION_QUESTIONS).slice(0, 4).map(q => ({
    ...q,
    options: shuffle(q.options),
  }))

  return shuffle([...vocabQs, ...grammarQs, ...collocationQs])
}

const TYPE_LABEL: Record<string, string> = {
  vocabulary: '📚 Lüğət',
  grammar: '✏️ Qrammatika',
  collocation: '🔗 Kollokasiya',
}

const TYPE_COLOR: Record<string, string> = {
  vocabulary: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  grammar: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  collocation: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

export default function MockTestPage() {
  const router = useRouter()
  const questions = useMemo(buildQuestions, [])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [done, setDone] = useState(false)

  const current = questions[idx]

  function select(opt: string) {
    if (selected) return
    setSelected(opt)
    setResults(r => [...r, opt === current.correct])
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setSelected(null)
    }
  }

  const score = results.filter(Boolean).length
  const pct = done ? Math.round((score / questions.length) * 100) : 0

  // ─── Header ──────────────────────────────────────────────
  const header = (
    <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
      <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">← Geri</button>
      <span className="font-semibold text-gray-900 dark:text-white text-sm">🌙 TOLES Mock Test</span>
      <span className="text-sm text-gray-400">{done ? '✓' : `${idx + 1}/${questions.length}`}</span>
    </header>
  )

  // ─── Nəticə ──────────────────────────────────────────────
  if (done) {
    const byType = { vocabulary: { c: 0, t: 0 }, grammar: { c: 0, t: 0 }, collocation: { c: 0, t: 0 } }
    questions.forEach((q, i) => {
      byType[q.type].t++
      if (results[i]) byType[q.type].c++
    })
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        {header}
        <div className="card max-w-sm w-full text-center mt-16">
          <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">TOLES Mock Test</h2>
          <p className="text-3xl font-bold text-blue-600 mb-1">{score}/{questions.length}</p>
          <p className="text-gray-500 mb-5">{pct}%</p>

          <div className="space-y-2 mb-6 text-left">
            {Object.entries(byType).map(([type, { c, t }]) => (
              <div key={type} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[type]}`}>
                  {TYPE_LABEL[type]}
                </span>
                <span className={`text-sm font-bold ${c === t ? 'text-green-600' : c >= t * 0.6 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {c}/{t}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 mb-6">
            💡 TOLES imtahanı: Lüğət + Qrammatika + Kollokasiya — bu test həmin formatı simulyasiya edir.
          </div>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
            Dashboard-a qayıt →
          </button>
        </div>
      </div>
    )
  }

  // ─── Test ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header}
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-indigo-500 transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLOR[current.type]}`}>
            {TYPE_LABEL[current.type]}
          </span>
          <span className="text-xs text-gray-400">{current.topic}</span>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 leading-relaxed">
          {current.question}
        </h2>

        <div className="space-y-3 mb-6">
          {current.options.map((opt) => {
            const isCorrect = opt === current.correct
            const isSelected = opt === selected
            let cls = 'w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all '
            if (!selected) cls += 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950'
            else if (isCorrect) cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
            else if (isSelected) cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
            else cls += 'border-gray-200 dark:border-gray-700 opacity-40'
            return (
              <button key={opt} onClick={() => select(opt)} className={cls}>
                {selected && isCorrect ? '✓ ' : selected && isSelected ? '✗ ' : ''}{opt}
              </button>
            )
          })}
        </div>

        {selected && (
          <>
            <div className={`mb-4 p-3 rounded-xl text-sm text-center font-medium ${
              results[results.length - 1]
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}>
              {results[results.length - 1] ? '✓ Düzgün!' : '✗ Yanlış'}
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">💡 İzah:</p>
              <p className="text-sm text-indigo-800 dark:text-indigo-200">{current.explanation}</p>
            </div>
            <button onClick={next} className="btn-primary w-full">
              {idx + 1 >= questions.length ? 'Nəticəni gör →' : 'Növbəti sual →'}
            </button>
          </>
        )}
      </main>
      <AITutorChat level="B2" />
    </div>
  )
}
