import { supabase } from '@/lib/supabase'

// Azure Pronunciation Assessment — Hibrid (ortaq açar + BYOK)
//
// NİYƏ AZURE LAZIMDIR?
// Brauzerin Web Speech API-si əslində SÖZ TANIMA (speech-to-text) mühərrikidir:
// səs siqnalını eşidib öz daxili dil modelinə əsasən "ən çox ehtimal olunan sözə"
// ÇEVİRİR. Yəni "ovver" desən belə, modelin lüğətində "offer" sözü daha "məntiqli"
// olduğu üçün onu "offer" kimi YAZIR — tələffüzün özünü deyil, NİYYƏTİNİ qaytarır.
// Buna görə mətn-müqayisəsi (Levenshtein/Soundex nə qədər yaxşı olsa belə) artıq
// "düzəldilmiş" mətnlə işləyir və əsl tələffüz fərqini görə bilmir.
//
// Azure Pronunciation Assessment isə FƏRQLİ İŞLƏYİR: səs siqnalını birbaşa
// gözlənilən FONEMLƏRLƏ (səs vahidləri) müqayisə edir və hər söz/fonem üçün
// dəqiqlik balı (0-100) qaytarır — yəni əsl tələffüzü qiymətləndirir, təxmin etmir.

const KEY_STORAGE = 'best_english_azure_speech_key'
const REGION_STORAGE = 'best_english_azure_speech_region'

// ─── Açar/region idarəsi (Gemini BYOK pattern-i ilə eyni — yalnız bu cihazda) ──
export function getAzureCreds(): { key: string; region: string } | null {
  if (typeof window === 'undefined') return null
  const key = localStorage.getItem(KEY_STORAGE)
  const region = localStorage.getItem(REGION_STORAGE)
  if (!key || !region) return null
  return { key, region }
}

export function setAzureCreds(key: string, region: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_STORAGE, key.trim())
  localStorage.setItem(REGION_STORAGE, region.trim().toLowerCase())
}

export function clearAzureCreds(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY_STORAGE)
  localStorage.removeItem(REGION_STORAGE)
}

export function hasAzureCreds(): boolean {
  return !!getAzureCreds()
}

// ─── Tipllər ────────────────────────────────────────────
export interface PhonemeAssessment {
  phoneme: string
  accuracyScore: number
}

export interface WordAssessment {
  word: string
  accuracyScore: number
  errorType: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | string
  phonemes: PhonemeAssessment[]   // fonem-səviyyəli ballar — Azure-un ümumi söz balı bəzən
                                  // tək bir səhv fonemi gizlədir (qısa sözlərdə xüsusilə)
  worstPhoneme: PhonemeAssessment | null  // ən aşağı bal alan fonem — istifadəçiyə dəqiq harada
                                          // səhv etdiyini göstərmək üçün
}

export interface PronunciationAssessmentResult {
  accuracyScore: number     // fonemlərin nə qədər dəqiq tələffüz olunduğu
  fluencyScore: number      // axıcılıq (fasilələr, tələsmə və s.)
  completenessScore: number // hədəf mətnin nə qədərinin deyildiyi
  pronScore: number         // ümumi xal (yuxarıdakıların çəkili ortalaması)
  words: WordAssessment[]
  recognizedText: string
  remaining?: number    // ortaq hovuzda neçə pulsuz cəhd qalıb (yalnız shared route qaytarır)
}

// Bütün sözlərdəki ən pis (ən aşağı bal alan) fonemin balını qaytarır.
// Tək söz məşqində "tələffüz düzgünlüyü" əslində ən zəif səslə müəyyən olunur.
export function worstPhonemeScore(result: Pick<PronunciationAssessmentResult, 'words'>): number {
  let worst = 100
  for (const w of result.words) {
    if (w.worstPhoneme && w.worstPhoneme.accuracyScore < worst) worst = w.worstPhoneme.accuracyScore
  }
  return worst
}

// Azure-un söz-səviyyəli ümumi balı bəzən aldadıcıdır: məsələn "contract" sözündə "k" səsini
// "j" kimi tələffüz etsən belə, söz balı 79-89 çıxa bilər (Azure ümumi balı fonemlərin sadə
// ortalaması kimi yox, perseptual/uzunluq-çəkili modellə hesablayır). Buna görə real
// "tələffüz düzgünlüyü"nü ən pis fonemin balı ilə korreksiya edirik.
//
// QEYD (eşik məntiqi): UI-də ✅ yaşıl ("Çox yaxın") = bal ≥ 80, 🟡 sarı = ≥ 55.
// Bantları elə qururuq ki, yaşıl yalnız ən zəif fonem ≥ 60 olanda mümkün olsun —
// yəni hər hansı səs açıq zəifdirsə (məs. "s" = 47), nəticə yaşıl OLMASIN.
export function effectivePronScore(result: Pick<PronunciationAssessmentResult, 'pronScore' | 'words'>): number {
  const worst = worstPhonemeScore(result)
  if (worst < 40) return Math.min(result.pronScore, worst + 12) // aydın səhv səs → açıq aşağı bal
  if (worst < 60) return Math.min(result.pronScore, worst + 20) // zəif səs → ən çoxu sarı (<80)
  if (worst < 75) return Math.min(result.pronScore, worst + 28) // qənaətbəxş → yaşıl mümkün
  return result.pronScore
}

// ─── Audio → 16kHz mono 16-bit PCM WAV (Azure REST tələbi) ─────
async function blobToWav16k(blob: Blob): Promise<ArrayBuffer> {
  const arrayBuf = await blob.arrayBuffer()
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  const ctx = new AudioCtx()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(arrayBuf.slice(0))
  } finally {
    ctx.close()
  }

  const targetRate = 16000
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()

  const samples = rendered.getChannelData(0)
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)               // PCM
  view.setUint16(22, 1, true)               // mono
  view.setUint32(24, targetRate, true)
  view.setUint32(28, targetRate * 2, true)  // byte rate
  view.setUint16(32, 2, true)               // block align
  view.setUint16(34, 16, true)              // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return buffer
}

// ─── Mikrofon qeydəalma — Səs Aktivliyi Aşkarlanması (VAD) ilə özü dayanır ──
//
// İstifadəçi danışığını bitirən kimi qeydəalma AVTOMATİK dayanır və təhlilə göndərilir —
// "Dayandır" düyməsini əl ilə basmaq lazım deyil (bu, axıcı, təbii təcrübə üçün vacibdir).
// Mikrofon səviyyəsini Web Audio Analyser ilə izləyirik: danışıq aşkarlanandan sonra
// qısa müddət (SILENCE_HOLD_MS) sükut davam edərsə, söz bitib hesab edib qeydəalmanı
// dayandırırıq. Maksimum müddət (maxMs) də ehtiyat fren kimi qalır.
export interface ActiveRecording {
  // Qeydəalma bitəndə (avtomatik aşkarlanma, max-müddət, ya da əl ilə dayandırma
  // ilə) bu promise audio blob-u ilə yerinə yetir
  done: Promise<Blob>
  // Əl ilə tez bitirmək üçün (məs. istifadəçi "Bitir" düyməsinə bassa)
  stop: () => void
}

const VAD_SILENCE_RMS = 0.02     // bu səviyyədən aşağı səs həcmi "sükut" sayılır
const VAD_SILENCE_HOLD_MS = 650  // danışıqdan sonra bu qədər sükut = söz bitib, dayandır
const VAD_MIN_SPEECH_MS = 200    // avtomatik dayandırma üçün ən azı bu qədər danışıq aşkarlanmalıdır

export async function startRecording(maxMs = 8000): Promise<ActiveRecording> {
  // Tələffüz qiymətləndirməsi üçün təmiz, işlənməmiş audio daha yaxşıdır:
  // noise suppression / auto-gain bəzən qısa sözləri "yeyir" → onları söndürürük
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  })
  const recorder = new MediaRecorder(stream)
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
    }
  })

  const startedAt = Date.now()
  // timeslice ilə start → data dövri olaraq boşaldılır, qısa yazılışlar itmir
  recorder.start(200)

  // ─── VAD qurulumu — mikrofon səviyyəsini canlı izləyirik ───────────────────
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  const audioCtx = new AudioCtx()
  const source = audioCtx.createMediaStreamSource(stream)
  const analyser = audioCtx.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const timeData = new Uint8Array(analyser.fftSize)

  let speechStartedAt: number | null = null
  let lastLoudAt: number | null = null
  let vadFrame = 0
  let finished = false
  let maxTimer: ReturnType<typeof setTimeout>

  const finish = () => {
    if (finished) return
    finished = true
    cancelAnimationFrame(vadFrame)
    clearTimeout(maxTimer)
    audioCtx.close().catch(() => {})
    if (recorder.state !== 'inactive') recorder.stop()
  }

  const tick = () => {
    analyser.getByteTimeDomainData(timeData)
    let sumSq = 0
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128
      sumSq += v * v
    }
    const rms = Math.sqrt(sumSq / timeData.length)
    const now = Date.now()

    if (rms > VAD_SILENCE_RMS) {
      if (speechStartedAt === null) speechStartedAt = now
      lastLoudAt = now
    } else if (
      speechStartedAt !== null &&
      lastLoudAt !== null &&
      now - speechStartedAt > VAD_MIN_SPEECH_MS &&
      now - lastLoudAt > VAD_SILENCE_HOLD_MS
    ) {
      finish()
      return
    }
    vadFrame = requestAnimationFrame(tick)
  }
  vadFrame = requestAnimationFrame(tick)

  // Ehtiyat fren — VAD nəyisə buraxsa belə, maksimum müddətdən sonra hökmən dayan
  maxTimer = setTimeout(finish, maxMs)

  return {
    done,
    stop: () => {
      // Çox tez "Bitir" basılıbsa (qısa söz), audio header-dən başqa heç nə
      // tutulmaya bilər → ən az ~600 ms yazılış zəmanəti veririk
      const elapsed = Date.now() - startedAt
      if (elapsed < 600) setTimeout(finish, 600 - elapsed)
      else finish()
    },
  }
}

function buildPronAssessmentHeader(referenceText: string): string {
  const json = JSON.stringify({
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: true,
  })
  return typeof window !== 'undefined' ? window.btoa(json) : Buffer.from(json).toString('base64')
}

// Azure cavabını ortaq formaya çevirir
function parseAzureResponse(data: any): PronunciationAssessmentResult {
  if (data.RecognitionStatus && data.RecognitionStatus !== 'Success') {
    throw new Error('NO_SPEECH')
  }

  const best = data.NBest?.[0]
  if (!best) throw new Error('NO_RESULT')

  // QEYD: Azure REST cavabında qiymətləndirmə balları ayrı "PronunciationAssessment"
  // obyektində yox, birbaşa nəticə/söz obyektinin üzərindədir — hər iki formatı yoxlayırıq
  const pa = best.PronunciationAssessment ?? best
  const words: WordAssessment[] = (best.Words ?? []).map((w: any) => {
    const phonemes: PhonemeAssessment[] = (w.Phonemes ?? []).map((p: any) => ({
      phoneme: p.Phoneme,
      accuracyScore: p.PronunciationAssessment?.AccuracyScore ?? p.AccuracyScore ?? 0,
    }))
    const worstPhoneme = phonemes.length
      ? phonemes.reduce((min: PhonemeAssessment, p: PhonemeAssessment) => (p.accuracyScore < min.accuracyScore ? p : min))
      : null
    return {
      word: w.Word,
      accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? w.AccuracyScore ?? 0,
      errorType: w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? 'None',
      phonemes,
      worstPhoneme,
    }
  })

  return {
    accuracyScore: pa.AccuracyScore ?? 0,
    fluencyScore: pa.FluencyScore ?? 0,
    completenessScore: pa.CompletenessScore ?? 0,
    pronScore: pa.PronScore ?? 0,
    words,
    recognizedText: best.Display ?? best.Lexical ?? '',
  }
}

// ─── 1) Birbaşa Azure — istifadəçinin öz açarı ilə (limitsiz, BYOK) ──
async function callDirect(
  creds: { key: string; region: string },
  referenceText: string,
  wav: ArrayBuffer
): Promise<PronunciationAssessmentResult> {
  const url = `https://${creds.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': creds.key,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Pronunciation-Assessment': buildPronAssessmentHeader(referenceText),
      Accept: 'application/json',
    },
    body: wav,
  })

  if (res.status === 401 || res.status === 403) throw new Error('BAD_KEY')
  if (res.status === 404) throw new Error('BAD_REGION')
  if (!res.ok) throw new Error(`AZURE_ERROR_${res.status}`)

  return parseAzureResponse(await res.json())
}

// ─── 2) Ortaq hovuz — server API route (sənin açarın gizli, ayda 20 limit) ──
async function callShared(
  referenceText: string,
  wav: ArrayBuffer
): Promise<PronunciationAssessmentResult> {
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) throw new Error('NO_AUTH')

  const form = new FormData()
  form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'speech.wav')
  form.append('referenceText', referenceText)
  form.append('accessToken', accessToken)

  const res = await fetch('/api/pronunciation', { method: 'POST', body: form })

  if (res.ok) return await res.json()

  const err = await res.json().catch(() => ({}))
  if (err.error === 'SHARED_LIMIT') throw new Error('SHARED_LIMIT') // aylıq 20 doldu → öz açarını əlavə et
  if (err.error === 'NO_SHARED_KEY') throw new Error('NO_SHARED_KEY') // server açarı hələ qurulmayıb
  if (err.error === 'NO_SPEECH') throw new Error('NO_SPEECH')
  throw new Error('AZURE_ERROR')
}

// ─── Əsas çağırış (hibrid): səsi Azure-a göndər, fonem-səviyyəli qiymət al ──
// 1) Öz açarı varsa → birbaşa Azure (limitsiz, öz kvotası)
// 2) Yoxsa → ortaq hovuz (server, ayda 20 pulsuz cəhd)
export async function assessPronunciation(
  referenceText: string,
  audioBlob: Blob
): Promise<PronunciationAssessmentResult> {
  const wav = await blobToWav16k(audioBlob)
  const creds = getAzureCreds()
  if (creds) return callDirect(creds, referenceText, wav)
  return callShared(referenceText, wav)
}
