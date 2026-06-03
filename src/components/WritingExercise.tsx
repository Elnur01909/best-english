'use client'
import { useState } from 'react'
import { checkWriting } from '@/lib/ai'

interface WritingExerciseProps {
  word: string
  definition: string
  onSubmit?: (text: string) => void
  optional?: boolean
  level?: string
}

export default function WritingExercise({
  word,
  definition,
  onSubmit,
  optional = true,
  level = 'B1',
}: WritingExerciseProps) {
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  function handleSubmit() {
    if (text.trim()) {
      onSubmit?.(text)
      setSubmitted(true)
    }
  }

  async function checkWithAI() {
    if (!text.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const fb = await checkWriting(word, definition, text, level)
      setAiFeedback(fb)
      onSubmit?.(text)
      setSubmitted(true)
    } catch (err: any) {
      if (err.message === 'NO_KEY') setAiError('AI Müəllimi aktivləşdir (sağ aşağıdakı 🎓 düymə).')
      else if (err.message === 'BAD_KEY') setAiError('API açarı yanlışdır.')
      else if (err.message === 'RATE_LIMIT') setAiError('Günlük pulsuz limit doldu.')
      else setAiError('Xəta baş verdi.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="card bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 mb-6">
      <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">
        ✍️ Yazma Məşqi {optional && '(İsteğe Bağlı)'}
      </h3>

      <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900 rounded text-sm text-amber-900 dark:text-amber-100">
        <p className="font-medium mb-1">"{word}" istifadə edərək bir cümlə yaz:</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 italic">{definition}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Məsələn: The contract must enter into force within 30 days."
        disabled={submitted}
        className="w-full p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900 text-amber-900 dark:text-amber-100 placeholder-amber-500 dark:placeholder-amber-400 disabled:opacity-50 resize-none"
        rows={3}
      />

      <div className="flex gap-2 mt-4">
        <button
          onClick={checkWithAI}
          disabled={!text.trim() || aiLoading || submitted}
          className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          {aiLoading ? '🎓 Yoxlanılır...' : '🎓 AI Müəllim yoxlasın'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitted}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          {submitted && !aiFeedback ? '✓' : 'Təqdim'}
        </button>
        {optional && !submitted && (
          <button
            onClick={() => setText('')}
            className="px-3 py-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg transition-colors text-sm"
          >
            Sil
          </button>
        )}
      </div>

      {aiError && <p className="mt-3 text-center text-red-500 text-xs">{aiError}</p>}

      {aiFeedback && (
        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded text-sm text-purple-800 dark:text-purple-200">
          <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">🎓 Müəllim rəyi:</p>
          <p className="whitespace-pre-wrap">{aiFeedback}</p>
        </div>
      )}

      {submitted && !aiFeedback && (
        <div className="mt-3 p-3 bg-green-100 dark:bg-green-950 rounded text-sm text-green-800 dark:text-green-200">
          ✓ <strong>Əla!</strong> Bu söz indi aktiv lüğətinizə keçib. Bundan sonra danışma və yazıda istifadə edin.
        </div>
      )}
    </div>
  )
}
