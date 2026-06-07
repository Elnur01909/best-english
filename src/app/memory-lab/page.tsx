'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getUser, getUserProfile, getLeechWords,
  getDeepDive, saveDeepDive,
} from '@/lib/supabase'
import { generateDeepEncoding, type DeepEncoding } from '@/lib/ai'
import AudioPlayer from '@/components/AudioPlayer'
import OutputModal from '@/components/OutputModal'
import ProfessorWidget from '@/components/ProfessorWidget'
import vocabData from '@/data/vocab.json'
import type { VocabItem } from '@/types'

// ════════════════════════════════════════════════════════════════
// 🧪 Yaddaş Laboratoriyası — MÜSTƏQİL funksiya
// Günlük plana / SRS axınına HEÇ BİR TƏSİR ETMİR (heç bir progress
// yazılmır). Sadəcə 9 elmi-əsaslı yaddaş üsulunu BİR sözün üzərində
// ardıcıl tətbiq edən, könüllü, dərinləşdirici məşq otağıdır.
// ════════════════════════════════════════════════════════════════

const SESSION_SIZE = 5

type Stage = 'recall' | 'context' | 'encode' | 'generate'

const STAGES: { key: Stage; emoji: string; label: string; tip: string }[] = [
  { key: 'recall',   emoji: '🧠', label: 'Aktiv Yada Salma',         tip: 'Üsul #3 — Açmadan əvvəl özün xatırla' },
  { key: 'context',  emoji: '📖', label: 'Zəngin Kontekst + Səs',     tip: 'Üsul #4 və #8 — Cümlədə gör, ucadan tələffüz et' },
  { key: 'encode',   emoji: '🔑', label: 'Açar Söz · Vizual · Kök',   tip: 'Üsul #1, #2, #6, #9 — Mnemonika, şəkil, etimologiya, emosiya' },
  { key: 'generate', emoji: '✍️', label: 'Öz Cümləni Yarat',          tip: 'Üsul #5 — Generasiya effekti' },
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pickSessionWords(level: string, leechIds: number[]): VocabItem[] {
  const all = vocabData as VocabItem[]
  const used = new Set<number>()
  const result: VocabItem[] = []

  // 1) Əvvəlcə "leech" sözlər (ən çox unudulanlar) — read-only, plana toxunmur
  for (const id of leechIds) {
    const v = all.find(x => x.id === id)
    if (v && !used.has(v.id)) { result.push(v); used.add(v.id) }
    if (result.length >= SESSION_SIZE) break
  }

  // 2) Çatmırsa — istifadəçinin səviyyəsinə uyğun təsadüfi sözlərlə tamamla
  if (result.length < SESSION_SIZE) {
    const sameLevel = shuffle(all.filter(v => v.level === level && !used.has(v.id)))
    for (const v of sameLevel) {
      result.push(v); used.add(v.id)
      if (result.length >= SESSION_SIZE) break
    }
  }

  // 3) Hələ də çatmırsa — istənilən səviyyədən təsadüfi
  if (result.length < SESSION_SIZE) {
    const rest = shuffle(all.filter(v => !used.has(v.id)))
    for (const v of rest) {
      result.push(v); used.add(v.id)
      if (result.length >= SESSION_SIZE) break
    }
  }

  return result
}

export default function MemoryLabPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userLevel, setUserLevel] = useState('B1')
  const [loading, setLoading] = useState(true)

  const [words, setWords] = useState<VocabItem[]>([])
  const [wIdx, setWIdx] = useState(0)
  const [stage, setStage] = useState<Stage>('recall')
  const [stageIdx, setStageIdx] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  // Recall mərhələsi
  const [revealed, setRevealed] = useState(false)
  // Kontekst mərhələsi
  const [showAzExample, setShowAzExample] = useState(false)
  // Dərin kodlaşdırma (mnemonika + etimologiya + vizual)
  const [deepDive, setDeepDive] = useState<DeepEncoding | null>(null)
  const [deepDiveLoading, setDeepDiveLoading] = useState(false)
  const [deepDiveError, setDeepDiveError] = useState(false)
  const [visualizeMode, setVisualizeMode] = useState(false)
  // Generasiya mərhələsi
  const [showOutputModal, setShowOutputModal] = useState(false)
  // Geri qayıdanda əvvəlki sözün SON mərhələsindən başlamaq üçün bayraq
  const [landOnLastStage, setLandOnLastStage] = useState(false)

  const currentWord = words[wIdx] ?? null

  // ─── Başlanğıc: sessiya üçün sözləri seç ───────────────────────
  useEffect(() => {
    async function init() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: prof } = await getUserProfile(user.id)
      const level = prof?.level ?? 'B1'
      setUserLevel(level)

      const { data: leech } = await getLeechWords(user.id, SESSION_SIZE)
      const leechIds = (leech ?? []).map((c: any) => c.vocab_id as number)

      setWords(pickSessionWords(level, leechIds))
      setLoading(false)
    }
    init()
  }, [router])

  // ─── Yeni sözə keçəndə hər şeyi sıfırla ────────────────────────
  // Adətən ilk mərhələdən (recall) başlanır; "Geri" ilə əvvəlki sözə
  // qayıdanda isə (landOnLastStage) onun SON mərhələsindən davam edirik.
  const resetWordState = useCallback((landLast: boolean) => {
    const targetIdx = landLast ? STAGES.length - 1 : 0
    setStage(STAGES[targetIdx].key)
    setStageIdx(targetIdx)
    setRevealed(landLast)   // əvvəlki söz üçün məna artıq açılmışdı
    setShowAzExample(false)
    setDeepDive(null)
    setDeepDiveError(false)
    setVisualizeMode(false)
    setLandOnLastStage(false)
  }, [])

  useEffect(() => { resetWordState(landOnLastStage) }, [wIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── "Açar söz + Vizual + Kök" mərhələsinə girəndə AI/keş yüklə ─
  const loadDeepDive = useCallback(async () => {
    if (!currentWord || deepDive || deepDiveLoading) return
    setDeepDiveLoading(true)
    setDeepDiveError(false)
    try {
      const { data: cached } = await getDeepDive(currentWord.id)
      if (cached && (cached.mnemonic_az || cached.etymology_az || cached.visual_az)) {
        setDeepDive({ mnemonic: cached.mnemonic_az, etymology: cached.etymology_az, visual: cached.visual_az })
        return
      }
      const generated = await generateDeepEncoding(currentWord.term, currentWord.az_translation, currentWord.en_example)
      setDeepDive(generated)
      saveDeepDive(currentWord.id, generated).catch(() => {})
    } catch {
      setDeepDiveError(true)
    } finally {
      setDeepDiveLoading(false)
    }
  }, [currentWord, deepDive, deepDiveLoading])

  function goToStage(next: Stage) {
    const idx = STAGES.findIndex(s => s.key === next)
    setStage(next)
    setStageIdx(idx)
  }

  // "Açar söz" mərhələsinə HƏR YOLLA (irəli, geri, sözlər arası) gələndə
  // material yüklənsin — yalnız bir dəfə, yoxdursa.
  useEffect(() => {
    if (stage === 'encode' && currentWord && !deepDive && !deepDiveLoading && !deepDiveError) {
      loadDeepDive()
    }
  }, [stage, currentWord, deepDive, deepDiveLoading, deepDiveError, loadDeepDive])

  // ─── Geri / İrəli naviqasiyası ─────────────────────────────────
  // Mərhələ daxilində geri qayıt; ilk mərhələdəsənsə — əvvəlki sözə keç
  // (əvvəlki sözün son mərhələsindən davam et ki, hər şeyi yenidən etmə).
  function prevStage() {
    if (stageIdx > 0) {
      const target = STAGES[stageIdx - 1].key
      setStage(target)
      setStageIdx(stageIdx - 1)
      return
    }
    if (wIdx > 0) {
      setWIdx(wIdx - 1)
      setLandOnLastStage(true)
    }
  }

  const canGoBack = stageIdx > 0 || wIdx > 0

  function nextWord() {
    if (wIdx + 1 < words.length) {
      setWIdx(wIdx + 1)
    } else {
      setSessionDone(true)
    }
  }

  function startNewSession() {
    setSessionDone(false)
    setWIdx(0)
    setLoading(true)
    ;(async () => {
      if (!userId) return
      const { data: leech } = await getLeechWords(userId, SESSION_SIZE)
      const leechIds = (leech ?? []).map((c: any) => c.vocab_id as number)
      setWords(pickSessionWords(userLevel, leechIds))
      setLoading(false)
    })()
  }

  function handleOutputComplete() {
    setShowOutputModal(false)
    nextWord()
  }

  // ─── Render: yüklənmə ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🧪</div>
          <p className="text-gray-500 dark:text-gray-400">Yaddaş Laboratoriyası hazırlanır...</p>
        </div>
      </div>
    )
  }

  // ─── Render: sessiya bitdi ─────────────────────────────────────
  if (sessionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Dərin Kodlaşdırma Tamamlandı!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <strong>{words.length}</strong> sözü 9 elmi üsulla emal etdin: mnemonika, vizual təsvir,
            etimologiya, aktiv yada salma, zəngin kontekst və öz cümlən ✍️
          </p>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⏰ <strong>Üsul #7 — Təkrarı buraxma:</strong> Bu sözlər artıq sənin gündəlik SRS planındadır,
              sistemin onları avtomatik vaxtında xatırladacaq. Sənə qalan — sadəcə hər gün gəlib kartları
              izləmək. Bu laboratoriya isə sözləri "ilk dəfə" daha DƏRİN köklərlə yadda saxlamaq üçündür.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={startNewSession} className="btn-secondary flex-1">
              🔄 Yeni sessiya (5 yeni söz)
            </button>
            <button onClick={() => router.push('/dashboard')} className="btn-primary flex-1">
              Ana Səhifəyə Qayıt
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🤔</div>
          <p className="text-gray-500 mb-4">Hələ lüğətdə söz yoxdur.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">Geri qayıt</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {showOutputModal && currentWord && (
        <OutputModal vocabWord={currentWord} onComplete={handleOutputComplete} level={userLevel} />
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">
              ← Çıx
            </button>
            <h1 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
              🧪 Yaddaş Laboratoriyası
            </h1>
            <span className="text-sm text-gray-400">{wIdx + 1} / {words.length}</span>
          </div>
          {/* Mərhələ göstəricisi */}
          <div className="max-w-2xl mx-auto mt-3 flex gap-1.5">
            {STAGES.map((s, i) => (
              <div
                key={s.key}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < stageIdx ? 'bg-green-500' : i === stageIdx ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            ))}
          </div>
          <p className="max-w-2xl mx-auto mt-1.5 text-xs text-gray-400">
            {STAGES[stageIdx].emoji} {STAGES[stageIdx].label} — <span className="italic">{STAGES[stageIdx].tip}</span>
          </p>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
          <div className="card">
            {/* Söz başlığı — bütün mərhələlərdə görünür + Professor bələdçi */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{currentWord.term}</h2>
                <span className="text-xs text-gray-400 italic">{currentWord.pos} · {currentWord.topic}</span>
                <div className="mt-3"><AudioPlayer word={currentWord.term} variant="card" /></div>
              </div>
              {/* Professor: yada salma mərhələsində "düşünür" (açmadan əvvəl xatırla),
                  məna açılanda sevinir, digər mərhələlərdə neytral bələdçi mesajı verir */}
              <ProfessorWidget
                mood={stage === 'recall' ? (revealed ? 'happy' : 'thinking') : 'neutral'}
                message={
                  stage === 'recall'
                    ? (revealed ? 'Afərin! Cəhd yaddaşı gücləndirir 💪' : 'Açmadan əvvəl özün xatırla 🧠')
                    : stage === 'context'
                      ? 'Cümlədə gör və ucadan tələffüz et 🔊'
                      : stage === 'encode'
                        ? 'Açar söz və şəkillə yaddaşa "yapışdır" 🔑'
                        : 'İndi ÖZ cümləni yarat — generasiya effekti ✍️'
                }
              />
            </div>

            {/* ═══ Mərhələ 1: Aktiv Yada Salma ═══ */}
            {stage === 'recall' && (
              <div>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🧠 Açmadan əvvəl <strong>özün</strong> xatırlamağa çalış: <em>"{currentWord.term}"</em> nə deməkdir?
                    Səhv etsən belə problem deyil — cəhd etmək yaddaşı gücləndirir (testing effect).
                  </p>
                </div>

                {!revealed ? (
                  <button onClick={() => setRevealed(true)} className="btn-primary w-full mb-2">
                    Mənanı göstər
                  </button>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 space-y-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{currentWord.az_translation}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">{currentWord.en_def}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {canGoBack && (
                    <button onClick={prevStage} className="btn-secondary px-4 flex-shrink-0">
                      ← Geri
                    </button>
                  )}
                  <button
                    onClick={() => goToStage('context')}
                    disabled={!revealed}
                    className="btn-primary flex-1"
                  >
                    Növbəti: Kontekstdə gör →
                  </button>
                </div>
              </div>
            )}

            {/* ═══ Mərhələ 2: Zəngin Kontekst + Səs ═══ */}
            {stage === 'context' && (
              <div>
                <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-gray-900 dark:text-white">{currentWord.en_example}</p>
                    <AudioPlayer word={currentWord.en_example} variant="sentence" isSentence />
                  </div>
                  {showAzExample && (
                    <p className="text-sm text-purple-700 dark:text-purple-300 italic border-t border-purple-200 dark:border-purple-800 pt-2">
                      {currentWord.az_example}
                    </p>
                  )}
                  <button
                    onClick={() => setShowAzExample(v => !v)}
                    className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {showAzExample ? '🌐 Tərcüməni gizlət' : '🌐 Tərcüməni göstər'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  📖 Sözü tək yox, <strong>cümlə içində</strong> öyrənmək 6 ay sonra 67% daha güclü yaddaş yaradır.
                  🗣️ İndi cümləni ucadan, audio ilə birlikdə təkrarla — neçə kanal işə düşsə, bir o qədər güclü iz qalır.
                </p>
                <div className="flex gap-2">
                  {canGoBack && (
                    <button onClick={prevStage} className="btn-secondary px-4 flex-shrink-0">
                      ← Geri
                    </button>
                  )}
                  <button onClick={() => goToStage('encode')} className="btn-primary flex-1">
                    Növbəti: Açar söz + Vizual + Kök →
                  </button>
                </div>
              </div>
            )}

            {/* ═══ Mərhələ 3: Açar Söz + Vizual + Etimologiya ═══ */}
            {stage === 'encode' && (
              <div>
                {deepDiveLoading && (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2 animate-pulse">🧪</div>
                    <p className="text-sm text-gray-400">AI dərin kodlaşdırma materialı hazırlayır...</p>
                  </div>
                )}

                {deepDiveError && !deepDiveLoading && (
                  <div className="text-center py-6">
                    <p className="text-sm text-red-500 mb-3">Material yüklənmədi.</p>
                    <button onClick={() => { setDeepDive(null); loadDeepDive() }} className="btn-secondary text-sm">
                      Yenidən cəhd et
                    </button>
                  </div>
                )}

                {deepDive && !deepDiveLoading && (
                  <div className="space-y-3 mb-4">
                    {deepDive.mnemonic && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">🔑 Açar Söz Metodu (Mnemonika)</p>
                        <p className="text-sm text-amber-900 dark:text-amber-100">{deepDive.mnemonic}</p>
                      </div>
                    )}

                    {deepDive.visual && (
                      <div className="bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                        <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 mb-1">🖼️ İkili Kodlaşdırma — Vizual Səhnə</p>
                        <p className="text-sm text-pink-900 dark:text-pink-100 mb-3">{deepDive.visual}</p>
                        {!visualizeMode ? (
                          <button onClick={() => setVisualizeMode(true)} className="text-xs font-medium text-pink-600 dark:text-pink-400 hover:underline">
                            👁️ Gözlərimi yumub canlandırıram...
                          </button>
                        ) : (
                          <div className="text-center py-3 bg-pink-100 dark:bg-pink-900 rounded-lg">
                            <p className="text-sm text-pink-800 dark:text-pink-200">
                              😌 Əla! İndi bu səhnəni təxəyyülündə daha <strong>gülməli, qəribə, hətta şok edici</strong> et —
                              emosional səhnələr beyin tərəfindən daha güclü saxlanılır (Üsul #9).
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {deepDive.etymology && (
                      <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">🌳 Etimologiya — Kökün izi</p>
                        <p className="text-sm text-emerald-900 dark:text-emerald-100">{deepDive.etymology}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {canGoBack && (
                    <button onClick={prevStage} className="btn-secondary px-4 flex-shrink-0">
                      ← Geri
                    </button>
                  )}
                  <button
                    onClick={() => goToStage('generate')}
                    disabled={deepDiveLoading || (!deepDive && !deepDiveError)}
                    className="btn-primary flex-1"
                  >
                    Növbəti: Öz cümləni yarat →
                  </button>
                </div>
              </div>
            )}

            {/* ═══ Mərhələ 4: Generasiya ═══ */}
            {stage === 'generate' && (
              <div>
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✍️ <strong>Generasiya effekti:</strong> Sözü sadəcə oxumaqdansa, <strong>özün</strong> bir cümlə qurub
                    yazanda yaddaş izi qat-qat dərinləşir — həm də TOLES yazı bacarığın inkişaf edir. İndi "{currentWord.term}"
                    sözü ilə öz cümləni yaz, AI müəllim sənə rəy versin.
                  </p>
                </div>
                <div className="flex gap-2">
                  {canGoBack && (
                    <button onClick={prevStage} className="btn-secondary px-4 flex-shrink-0">
                      ← Geri
                    </button>
                  )}
                  <button onClick={() => setShowOutputModal(true)} className="btn-primary flex-1">
                    Cümləmi yazıram →
                  </button>
                  {wIdx + 1 < words.length && (
                    <button onClick={nextWord} className="btn-secondary px-4 flex-shrink-0">
                      Sözü ötür →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            🗂️ Bu, sənin gündəlik SRS planından <strong>ayrı, könüllü</strong> bir məşqdir — heç bir irəliləyiş
            statistikasına və ya kart cədvəlinə təsir etmir.
          </p>
        </main>
      </div>
    </>
  )
}
