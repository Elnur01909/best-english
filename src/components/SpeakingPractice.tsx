'use client'
import { useState, useRef } from 'react'

interface SpeakingPracticeProps {
  term: string        // Söylənməli termin (məs: "NEGLIGENCE")
  onResult?: (correct: boolean, heard: string) => void
}

export default function SpeakingPractice({ term, onResult }: SpeakingPracticeProps) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'result'>('idle')
  const [heard, setHeard] = useState('')
  const [correct, setCorrect] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  function normalize(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z\s]/g, '')
  }

  function start() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 3

    setStatus('listening')
    setHeard('')

    recognition.onresult = (e: any) => {
      // Bütün alternativləri yoxla
      const results: string[] = []
      for (let i = 0; i < e.results[0].length; i++) {
        results.push(e.results[0][i].transcript)
      }

      const normTerm = normalize(term)
      let bestMatch = results[0]
      let isCorrect = false

      for (const r of results) {
        if (normalize(r) === normTerm) {
          isCorrect = true
          bestMatch = r
          break
        }
        // Qismən uyğunluq (multi-word terminlər üçün)
        if (normTerm.includes(normalize(r)) || normalize(r).includes(normTerm)) {
          isCorrect = true
          bestMatch = r
          break
        }
      }

      setHeard(bestMatch)
      setCorrect(isCorrect)
      setStatus('result')
      onResult?.(isCorrect, bestMatch)
    }

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        setHeard('Səs aşkarlanmadı')
      } else if (e.error === 'not-allowed') {
        setHeard('Mikrofon icazəsi verilməyib')
      } else {
        setHeard(`Xəta: ${e.error}`)
      }
      setCorrect(false)
      setStatus('result')
    }

    recognition.onend = () => {
      if (status === 'listening') setStatus('idle')
    }

    recognition.start()
  }

  function stop() {
    recognitionRef.current?.stop()
    setStatus('idle')
  }

  function reset() {
    setStatus('idle')
    setHeard('')
  }

  if (!supported) return (
    <p className="text-xs text-gray-400">Bu brauzer danışma məşqini dəstəkləmir (Chrome istifadə et)</p>
  )

  return (
    <div className="mt-3">
      {status === 'idle' && (
        <button
          onClick={start}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900 transition-colors text-sm font-medium"
        >
          🎤 Danış
        </button>
      )}

      {status === 'listening' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 dark:bg-red-950 border-2 border-red-400 text-red-700 dark:text-red-300 text-sm font-medium animate-pulse">
            🎙️ Dinlənilir...
          </div>
          <button onClick={stop} className="text-xs text-gray-500 hover:text-gray-700">
            Dayandır
          </button>
        </div>
      )}

      {status === 'result' && (
        <div className="space-y-2">
          <div className={`p-3 rounded-xl border-2 text-sm ${
            correct
              ? 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
              : 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{correct ? '✅' : '❌'}</span>
              <span className="font-semibold">{correct ? 'Düzgün tələffüz!' : 'Yenidən cəhd et'}</span>
            </div>
            <p className="text-xs opacity-80">
              Eşidildi: <strong>"{heard}"</strong>
            </p>
            {!correct && (
              <p className="text-xs opacity-80 mt-0.5">
                Düzgün: <strong>"{term}"</strong>
              </p>
            )}
          </div>
          <button onClick={reset}
            className="text-xs text-orange-600 hover:text-orange-800 font-medium">
            🎤 Yenidən cəhd et
          </button>
        </div>
      )}
    </div>
  )
}
