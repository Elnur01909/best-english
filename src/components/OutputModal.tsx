'use client'
import { useState } from 'react'
import type { VocabItem } from '@/types'

interface OutputModalProps {
  vocabWord: VocabItem
  onComplete: () => void
}

export default function OutputModal({ vocabWord, onComplete }: OutputModalProps) {
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ✍️ Output Zamanıdır!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Beyin öğrendiğini fiilen yazdığında daha iyi möhkəmlənir.
          </p>
        </div>

        {/* Instruksiya */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <strong>"{vocabWord.term}"</strong> istifadə edərək bir cümlə yaz:
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            {vocabWord.en_def}
          </p>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Məsələn: The breach of contract was discovered after the deadline."
          disabled={submitted}
          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 resize-none mb-4"
          rows={3}
        />

        {/* Nəticə mesajı */}
        {submitted && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ <strong>Əla!</strong> Bu söz indi fəal lüğətinizə keçib. Danışmada və yazıda istifadə edin.
            </p>
          </div>
        )}

        {/* Düymələr */}
        <div className="flex gap-3">
          <button
            onClick={onComplete}
            disabled={!text.trim() && !submitted}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitted ? 'Davam Et →' : 'Təqdim Et'}
          </button>
          <button
            onClick={() => onComplete()}
            className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium"
          >
            Skip
          </button>
        </div>

        {/* İnformasiya */}
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">
          💡 Output istənməyən, isteğe bağlı ama <strong>çox effektiv</strong>.
        </p>
      </div>
    </div>
  )
}
