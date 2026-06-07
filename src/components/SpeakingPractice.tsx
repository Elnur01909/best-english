'use client'
import { useState, useRef } from 'react'
import { evaluatePronunciation, type MatchTier } from '@/lib/pronunciation'
import {
  hasAzureCreds,
  startRecording,
  assessPronunciation,
  type ActiveRecording,
  type PronunciationAssessmentResult,
} from '@/lib/azureSpeech'
import AzureKeySetup from './AzureKeySetup'

interface SpeakingPracticeProps {
  term: string        // Söylənməli termin (məs: "NEGLIGENCE")
  onResult?: (correct: boolean, heard: string) => void
}

type Status = 'idle' | 'listening' | 'recording' | 'analyzing' | 'result' | 'error' | 'setup'

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

// Azure xalını (0-100) eyni 3-tier görünüşə çeviririk ki, UI vahid qalsın
function tierFromScore(score0to100: number): MatchTier {
  if (score0to100 >= 80) return 'high'
  if (score0to100 >= 55) return 'medium'
  return 'low'
}

export default function SpeakingPractice({ term, onResult }: SpeakingPracticeProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [azureMode, setAzureMode] = useState(() => hasAzureCreds())

  // Sadə rejim (Web Speech) nəticəsi
  const [heard, setHeard] = useState('')
  const [tier, setTier] = useState<MatchTier>('low')
  const [scorePct, setScorePct] = useState(0)

  // Azure rejimi nəticəsi
  const [azureResult, setAzureResult] = useState<PronunciationAssessmentResult | null>(null)

  const [errorMsg, setErrorMsg] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const recordingRef = useRef<ActiveRecording | null>(null)

  // ─── Sadə rejim: Web Speech API (söz tanıma + mətn-oxşarlıq) ──
  function startSimple() {
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

  function stopSimple() {
    recognitionRef.current?.stop()
    setStatus('idle')
  }

  // ─── Azure rejimi: mikrofonu lentə al → fonem-səviyyəli qiymət al ──
  async function startAzure() {
    setErrorMsg('')
    setAzureResult(null)
    try {
      setStatus('recording')
      const rec = await startRecording(8000)
      recordingRef.current = rec
    } catch {
      setErrorMsg('Mikrofon icazəsi verilməyib — brauzer tənzimləmələrindən icazə ver')
      setStatus('error')
    }
  }

  async function stopAzureAndAssess() {
    const rec = recordingRef.current
    if (!rec) return
    try {
      setStatus('analyzing')
      const blob = await rec.stop()
      recordingRef.current = null
      const result = await assessPronunciation(term, blob)
      setAzureResult(result)
      setStatus('result')
      onResult?.(result.pronScore >= 70, result.recognizedText)
    } catch (err: any) {
      recordingRef.current = null
      const code = err?.message
      if (code === 'NO_AZURE_KEY') {
        setStatus('setup')
        return
      } else if (code === 'BAD_KEY') {
        setErrorMsg('Azure açarı etibarsızdır — açarı yenidən yoxla (aşağıda dəyişə bilərsən)')
      } else if (code === 'BAD_REGION') {
        setErrorMsg('Region yanlışdır — Azure resursunun regionu ilə eyni olmalıdır')
      } else if (code === 'NO_SPEECH') {
        setErrorMsg('Səs aşkarlanmadı — daha bərkdən və aydın danış, yenidən cəhd et')
      } else {
        setErrorMsg('Texniki xəta baş verdi — bir az sonra yenidən cəhd et')
      }
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setHeard('')
    setAzureResult(null)
    setErrorMsg('')
  }

  function start() {
    if (azureMode) startAzure()
    else startSimple()
  }

  function stop() {
    if (azureMode) stopAzureAndAssess()
    else stopSimple()
  }

  if (status === 'setup') {
    return (
      <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <AzureKeySetup
          onSaved={() => { setAzureMode(true); reset() }}
          onSkip={() => { setAzureMode(false); reset() }}
        />
      </div>
    )
  }

  if (!supported && !azureMode) return (
    <p className="text-xs text-gray-400">Bu brauzer danışma məşqini dəstəkləmir (Chrome istifadə et)</p>
  )

  return (
    <div className="mt-3 space-y-2">
      {status === 'idle' && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={start}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900 transition-colors text-sm font-medium"
          >
            🎤 Danış
          </button>
          {azureMode ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              🎯 Dəqiq rejim aktivdir (Azure)
            </span>
          ) : (
            <button
              onClick={() => setStatus('setup')}
              className="text-[11px] text-blue-600 hover:text-blue-800 underline"
            >
              Daha dəqiq qiymətləndirmə istəyirsən? →
            </button>
          )}
        </div>
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

      {status === 'recording' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 dark:bg-red-950 border-2 border-red-400 text-red-700 dark:text-red-300 text-sm font-medium animate-pulse">
            🎙️ Səs yazılır — sözü aydın söylə...
          </div>
          <button onClick={stop} className="text-xs font-medium text-orange-600 hover:text-orange-800">
            ⏹ Bitir və yoxla
          </button>
        </div>
      )}

      {status === 'analyzing' && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 text-blue-700 dark:text-blue-300 text-sm font-medium">
          🔬 Tələffüz fonem-fonem analiz olunur...
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{errorMsg}</p>
          <div className="flex items-center gap-3">
            <button onClick={reset}
              className="text-xs text-orange-600 hover:text-orange-800 font-medium">
              🎤 Yenidən cəhd et
            </button>
            {azureMode && (
              <button onClick={() => { setAzureMode(false); reset() }}
                className="text-xs text-gray-400 hover:text-gray-600">
                Sadə rejimə keç
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Sadə rejim nəticəsi (Web Speech) ─── */}
      {status === 'result' && !azureMode && (() => {
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
            <div className="flex items-center gap-3">
              <button onClick={reset}
                className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                🎤 Yenidən cəhd et
              </button>
              <button onClick={() => setStatus('setup')}
                className="text-xs text-blue-600 hover:text-blue-800 underline">
                Daha dəqiq qiymətləndirmə istəyirsən? →
              </button>
            </div>
          </div>
        )
      })()}

      {/* ─── Azure rejimi nəticəsi (fonem-səviyyəli) ─── */}
      {status === 'result' && azureMode && azureResult && (() => {
        const overall = Math.round(azureResult.pronScore)
        const t = tierFromScore(overall)
        const style = TIER_STYLE[t]
        return (
          <div className="space-y-2">
            <div className={`p-3 rounded-xl border-2 text-sm ${style.border} ${style.bg} ${style.text}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{style.icon}</span>
                <span className="font-semibold">{style.label}</span>
                <span className="ml-auto text-[11px] font-normal opacity-70">{overall}/100 ümumi</span>
              </div>

              <p className="text-xs opacity-80">
                Sistemin eşitdiyi: <strong>"{azureResult.recognizedText || '—'}"</strong> · Hədəf: <strong>"{term}"</strong>
              </p>

              <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-2 py-1 text-center">
                  <div className="font-semibold">{Math.round(azureResult.accuracyScore)}</div>
                  <div className="opacity-70">Dəqiqlik</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-2 py-1 text-center">
                  <div className="font-semibold">{Math.round(azureResult.fluencyScore)}</div>
                  <div className="opacity-70">Axıcılıq</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-2 py-1 text-center">
                  <div className="font-semibold">{Math.round(azureResult.completenessScore)}</div>
                  <div className="opacity-70">Tamlıq</div>
                </div>
              </div>

              {azureResult.words.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {azureResult.words.map((w, i) => {
                    const wTier = tierFromScore(w.accuracyScore)
                    const badge =
                      wTier === 'high' ? 'bg-green-200/60 dark:bg-green-800/40 text-green-900 dark:text-green-100'
                      : wTier === 'medium' ? 'bg-amber-200/60 dark:bg-amber-800/40 text-amber-900 dark:text-amber-100'
                      : 'bg-orange-200/60 dark:bg-orange-800/40 text-orange-900 dark:text-orange-100'
                    return (
                      <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${badge}`}>
                        {w.word} · {Math.round(w.accuracyScore)}
                        {w.errorType !== 'None' && <span className="opacity-70"> ({w.errorType})</span>}
                      </span>
                    )
                  })}
                </div>
              )}

              {t !== 'high' && (
                <p className="text-[11px] opacity-70 mt-1.5 italic">
                  💡 Qırmızı/sarı işarələnmiş hissələr — fonem səviyyəsində fərqlərin olduğu yerlərdir.
                  Həmin səsləri ayrıca məşq et və yenidən cəhd et.
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
