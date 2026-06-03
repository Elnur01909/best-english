'use client'
import { useState } from 'react'

interface WritingExerciseProps {
  word: string
  definition: string
  onSubmit?: (text: string) => void
  optional?: boolean
}

export default function WritingExercise({
  word,
  definition,
  onSubmit,
  optional = true,
}: WritingExerciseProps) {
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (text.trim()) {
      onSubmit?.(text)
      setSubmitted(true)
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
          onClick={handleSubmit}
          disabled={!text.trim() || submitted}
          className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          {submitted ? '✓ Təqdim edildi' : 'Təqdim Et'}
        </button>
        {optional && (
          <button
            onClick={() => setText('')}
            disabled={submitted}
            className="px-4 py-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            Sil
          </button>
        )}
      </div>

      {submitted && (
        <div className="mt-3 p-3 bg-green-100 dark:bg-green-950 rounded text-sm text-green-800 dark:text-green-200">
          ✓ <strong>Əla!</strong> Bu söz indi aktiv lüğətinizə keçib. Bundan sonra danışma və yazıda istifadə edin.
        </div>
      )}
    </div>
  )
}
