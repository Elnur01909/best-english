'use client'
import { useState, useRef } from 'react'
import { evaluatePronunciation, type MatchTier } from '@/lib/pronunciation'

interface SpeakingPracticeProps {
  term: string        // Söylənməli termin (məs: "NEGLIGENCE")
  onResult?: (correct: boolean, heard: string) => void
}

const TIER_STYLE: Record<MatchTier, { border: string; bg: string; text: string; icon: string; label: string }> = {
  high: {
    border: 'border-green-400',
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-800 dark:text-green-200',
    icon: '✅',
    label: 'Çox yaxın tələffüz!',
  },
  medium: {
    border: 'border-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-800 dark:text-amber-200',
    icon: '🟡',
    label: 'Yaxındır — bir az fərq var',
  },
  low: {
    border: 'border-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-800 dark:text-orange-200',
    icon: '🧠',
    label: 'Fərqli səslənir — bir də cəhd et',
  },
}

export default function SpeakingPractice({ term, onResult }: SpeakingPracticeProps) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'result' | 'error'>('idle')
  const [heard, setHeard] = useState('')
  const [tier, setTier] = useState<MatchTier>('low')
  const [scorePct, setScorePct] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

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
    recognition.maxAlternatives = 5

    setStatus('listening')
    setHeard('')

    recognition.onresult = (e: any) => {
      const alternatives: string[] = []
      for (let i = 0; i < e.results[0].length; i++) {
        alternatives.push(e.results[0][i].transcript)
      }

      const result = evaluatePronunciation(term, alternatives)
      setHeard(result.heard)
      setTier(result.tier)
      setScorePct(Math.round(result.score * 100))
      setStatus('result')
      onResult?.(result.isCorrect, result.heard)
    }

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        setErrorMsg('Səs aşkarlanmadı — bir az daha aydın danış və yenidən cəhd et')
      } else if (e.error === 'not-allowed') {
        setErrorMsg('Mikrofon icazəsi verilməyib — brauzer tənzimləmələrindən icazə ver')
      } else {
        setErrorMsg(`Texniki xəta: ${e.error}`)
      }
      setStatus('error')
    }

    recognition.onend = () => {
      setStatus((prev) => (prev === 'listening' ? 'idle' : prev))
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
    setErrorMsg('')
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

      {status === 'error' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{errorMsg}</p>
          <button onClick={reset}
            className="text-xs text-orange-600 hover:text-orange-800 font-medium">
            🎤 Yenidən cəhd et
          </button>
        </div>
      )}

      {status === 'result' && (() => {
        const style = TIER_STYLE[tier]
        return (
          <div className="space-y-2">
            <div className={`p-3 rounded-xl border-2 text-sm ${style.border} ${style.bg} ${style.text}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{style.icon}</span>
                <span className="font-semibold">{style.label}</span>
                <span className="ml-auto text-[11px] font-normal opacity-70">{scorePct}% uyğunluq</span>
              </div>
              <p className="text-xs opacity-80">
                Sistemin eşitdiyi: <strong>"{heard}"</strong>
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                Hədəf söz: <strong>"{term}"</strong>
              </p>
              {tier !== 'high' && (
                <p className="text-[11px] opacity-70 mt-1.5 italic">
                  💡 Qeyd: bu, kompüterin "ən yaxşı təxmini"dir — nadir hüquqi terminləri tez-tez səhv tanıyır.
                  Əgər özünə əmin idin, bunu doğru tələffüz kimi qəbul edə bilərsən. Yuxarıdakı audionu dinləyib müqayisə et.
                </p>
              )}
            </div>
            <button onClick={reset}
              className="text-xs text-orange-600 hover:text-orange-800 font-medium">
              🎤 Yenidən cəhd et
            </button>
          </div>
        )
      })()}
    </div>
  )
}
