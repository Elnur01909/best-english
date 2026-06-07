'use client'
import { useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AITutorChat from '@/components/AITutorChat'
import AudioPlayer from '@/components/AudioPlayer'
import vocabData from '@/data/vocab.json'
import { saveSessionScore } from '@/lib/sessionScore'
import type { VocabItem } from '@/types'

interface MockQ {
  id: number
  type: 'vocabulary' | 'grammar' | 'collocation'
  question: string
  az: string          // AZ tərcümə
  options: string[]
  correct: string
  explanation: string
  topic: string
}

// ─── Qrammatika sualları ──────────────────────────────────
const GRAMMAR_QUESTIONS: MockQ[] = [
  {
    id: 3001, type: 'grammar', topic: 'Contract Law',
    question: 'The contract ___ signed by both parties before the deadline.',
    az: 'Müqavilə son tarixdən əvvəl hər iki tərəf tərəfindən ___ imzalandı.',
    options: ['was', 'were', 'has', 'did'], correct: 'was',
    explanation: 'Passive voice: "was signed" — müqavilə üzərində hərəkət edilib. Past simple passive = was/were + keçmiş feil.',
  },
  {
    id: 3002, type: 'grammar', topic: 'Court & Litigation',
    question: 'If the defendant ___ the terms, the claimant would have withdrawn the claim.',
    az: 'Əgər cavabdeh şərtləri ___ qəbul etsəydi, müddəi iddiasını geri götürərdi.',
    options: ['had accepted', 'accepted', 'would accept', 'has accepted'], correct: 'had accepted',
    explanation: 'Üçüncü şərt cümləsi: "If + past perfect, would have + past participle." Keçmişdə reallaşmayan fərziyyəvi vəziyyət.',
  },
  {
    id: 3003, type: 'grammar', topic: 'Employment Law',
    question: 'The employee ___ for the company for ten years when she was made redundant.',
    az: 'İşçi ixtisar edilən zaman şirkətdə on ildir ___ çalışırdı.',
    options: ['had worked', 'has worked', 'was working', 'worked'], correct: 'had worked',
    explanation: 'Past perfect: "had worked" — işsizlik (keçmiş hadisə) baş verməzdən əvvəl davam edən fəaliyyəti bildirir.',
  },
  {
    id: 3004, type: 'grammar', topic: 'Criminal Law',
    question: 'Not only ___ the defendant breach the contract, but he also failed to notify the other party.',
    az: 'Cavabdeh nəinki müqaviləni pozdu, həm də digər tərəfi xəbərdar etmədi.',
    options: ['did', 'had', 'was', 'does'], correct: 'did',
    explanation: '"Not only" + inversiya: köməkçi feil subyektin önünə keçir — "Not only did + subject + verb." Rəsmi hüquqi dil üçün xarakterikdir.',
  },
  {
    id: 3005, type: 'grammar', topic: 'Property Law',
    question: 'The landlord is required ___ the property in a habitable condition.',
    az: 'Ev sahibi mülkiyyəti yaşayış üçün münasib vəziyyətdə saxlamağa ___.',
    options: ['to maintain', 'maintaining', 'maintain', 'for maintain'], correct: 'to maintain',
    explanation: '"Required to + məsdər" düzgün quruluşdur. "Required to maintain" = hüquqi öhdəliyi var.',
  },
  {
    id: 3006, type: 'grammar', topic: 'Company Law',
    question: 'The director, ___ had a conflict of interest, was asked to leave the meeting.',
    az: 'Maraqların toqquşması olan direktor iclası tərk etməyi xahiş edildi.',
    options: ['who', 'which', 'whose', 'that'], correct: 'who',
    explanation: 'Qeyri-müəyyən müəyyənləşdirici cümlə: "who" — şəxslərə aiddir. "Which" əşyalara, "whose" mülkiyyəti bildirməyə işlənir.',
  },
  {
    id: 3007, type: 'grammar', topic: 'Tort Law',
    question: 'The claimant suffered significant loss ___ a result of the defendant\'s negligence.',
    az: 'Müddəi cavabdehin səhlənkarlığı ___ nəticəsində əhəmiyyətli ziyan çəkdi.',
    options: ['as', 'for', 'because', 'due'], correct: 'as',
    explanation: '"As a result of" — düzgün ön söz birləşməsidir. "For a result" və "due result" yanlışdır.',
  },
  {
    id: 3008, type: 'grammar', topic: 'Criminal Law',
    question: 'Had the witness told the truth, the verdict ___ different.',
    az: 'Şahid həqiqəti deyəsəydi, hüküm fərqli ___ olardı.',
    options: ['would have been', 'would be', 'had been', 'was'], correct: 'would have been',
    explanation: 'Çevrilmiş üçüncü şərt: "Had + past perfect" → "If had" yerinə. Nəticə cümləsi = "would have been" (keçmiş şərti).',
  },
  {
    id: 3009, type: 'grammar', topic: 'Contract Law',
    question: 'She has been working on this case ___ three months.',
    az: 'O, bu işlə ___ üç aydır məşğuldur.',
    options: ['for', 'since', 'during', 'from'], correct: 'for',
    explanation: '"For + zaman dövrü" (three months, two years). "Since" isə konkret başlanğıc nöqtəsi ilə işlənir (since March, since 2020).',
  },
  {
    id: 3010, type: 'grammar', topic: 'Court & Litigation',
    question: 'The evidence presented ___ the case significantly.',
    az: 'Təqdim edilən dəlillər işi əhəmiyyətli dərəcədə ___.',
    options: ['strengthened', 'strengthen', 'was strengthen', 'strengthening'], correct: 'strengthened',
    explanation: 'Sadə keçmiş zaman: "strengthened" — dəlillər (subyekt) işi gücləndir hərəkətini icra etdi.',
  },
  {
    id: 3011, type: 'grammar', topic: 'Contract Law',
    question: 'The parties ___ reached a settlement by now if negotiations had continued.',
    az: 'Danışıqlar davam etsəydi, tərəflər indi barışığa ___ nail olardı.',
    options: ['would have', 'had', 'have', 'will have'], correct: 'would have',
    explanation: 'Qarışıq şərt: "would have + past participle" — keçmişdə reallaşmayan nəticə. "Would have reached" = baş verməyən keçmiş hal.',
  },
  {
    id: 3012, type: 'grammar', topic: 'Employment Law',
    question: 'The employee must ___ her complaints in writing within 14 days.',
    az: 'İşçi şikayətlərini 14 gün ərzində yazılı formada ___ gərəkdir.',
    options: ['submit', 'submitted', 'submitting', 'to submit'], correct: 'submit',
    explanation: '"Must + bare infinitive" (feelin saf forması). "Must submitted" yanlışdır — must-dan sonra məsdər gəlir.',
  },
]

// ─── Kollokasiya sualları ─────────────────────────────────
const COLLOCATION_QUESTIONS: MockQ[] = [
  {
    id: 2001, type: 'collocation', topic: 'Contract Law',
    question: 'The parties agreed to ___ into a legally binding contract.',
    az: 'Tərəflər hüquqi bağlayıcı müqavilə ___ girmək barədə razılaşdılar.',
    options: ['enter', 'go', 'put', 'set'], correct: 'enter',
    explanation: '"Enter into a contract" — müqavilə bağlamaq üçün standart hüquqi birləşmə.',
  },
  {
    id: 2002, type: 'collocation', topic: 'Tort Law',
    question: 'The defendant was found ___ for the damage caused by his negligence.',
    az: 'Cavabdeh öz səhlənkarlığının nəticəsindəki ziyana görə ___ hesab edildi.',
    options: ['liable', 'guilty', 'responsible of', 'blamed'], correct: 'liable',
    explanation: '"Liable for" — tort hüququnda "hüquqi məsul" mənasında işlənir. "Guilty" cinayət hüququna aiddir.',
  },
  {
    id: 2003, type: 'collocation', topic: 'Court & Litigation',
    question: 'The claimant decided to ___ a claim against the defendant.',
    az: 'Müddəi cavabdehə qarşı iddia ___ qərarına gəldi.',
    options: ['bring', 'make', 'put', 'raise of'], correct: 'bring',
    explanation: '"Bring a claim" — hüquqi iddia qaldırmaq üçün standart birləşmə.',
  },
  {
    id: 2004, type: 'collocation', topic: 'Company Law',
    question: 'The board of directors must act ___ the best interests of the company.',
    az: 'Direktorlar şurası şirkətin ___ ən yaxşı maraqları naminə hərəkət etməlidir.',
    options: ['in', 'for', 'on', 'within'], correct: 'in',
    explanation: '"Act in the best interests" — direktorluq fiducsiar borcu üçün standart birləşmə.',
  },
  {
    id: 2005, type: 'collocation', topic: 'Criminal Law',
    question: 'The defendant entered a ___ of guilty at the first hearing.',
    az: 'Cavabdeh ilk dinləmədə günahkarlıq ___ bildirdi.',
    options: ['plea', 'claim', 'statement of', 'declaration'], correct: 'plea',
    explanation: '"Enter a plea" — cavabdehin məhkəmədə rəsmi mövqeyini bildirməsi.',
  },
  {
    id: 2006, type: 'collocation', topic: 'Contract Law',
    question: 'The seller was held ___ breach of contract for failing to deliver.',
    az: 'Satıcı çatdırılmaya görə müqavilə pozuntusunda ___ tutuldu.',
    options: ['in', 'for', 'of', 'under'], correct: 'in',
    explanation: '"In breach of contract" — müqavilə şərtlərinin yerinə yetirilmədiyini ifadə edən standart birləşmə.',
  },
  {
    id: 2007, type: 'collocation', topic: 'Court & Litigation',
    question: 'The jury returned a ___ of not guilty after deliberation.',
    az: 'Münsiflər heyəti müzakirədən sonra bəraət ___ verdi.',
    options: ['verdict', 'decision of', 'judgment', 'ruling'], correct: 'verdict',
    explanation: '"Return a verdict" — münsiflər heyətinin qərarını açıqlamaq üçün standart birləşmə.',
  },
  {
    id: 2008, type: 'collocation', topic: 'Employment Law',
    question: 'The employee was awarded compensation for ___ dismissal.',
    az: 'İşçi ___ işdən çıxarılmaya görə kompensasiya aldı.',
    options: ['unfair', 'wrong', 'illegal', 'bad'], correct: 'unfair',
    explanation: '"Unfair dismissal" — Əmək Hüquqları Qanunu əsasında ədalətsiz işdən çıxarılma üçün hüquqi termin.',
  },
  {
    id: 2009, type: 'collocation', topic: 'Contract Law',
    question: 'The parties reached a ___ out of court, avoiding a full trial.',
    az: 'Tərəflər tam məhkəmə prosesindən qaçaraq məhkəmə xaricində ___ əldə etdilər.',
    options: ['settlement', 'decision', 'agreement of', 'deal'], correct: 'settlement',
    explanation: '"Reach a settlement" — mübahisəni məhkəmədən kənarda həll etmək.',
  },
  {
    id: 2010, type: 'collocation', topic: 'Criminal Law',
    question: 'The accused was acquitted of all ___ after the prosecution failed.',
    az: 'İttihamçının işi sübut edə bilməməsindən sonra müttəhim bütün ___ bəraət aldı.',
    options: ['charges', 'claims', 'accusations of', 'counts'], correct: 'charges',
    explanation: '"Acquitted of all charges" — bütün cinayət ittihamlarından bəraət almaq üçün standart birləşmə.',
  },
  {
    id: 2011, type: 'collocation', topic: 'Property Law',
    question: 'The bank placed a ___ on the property to secure the loan.',
    az: 'Bank krediti təmin etmək üçün mülkiyyət üzərinə ___ qoydu.',
    options: ['lien', 'charge of', 'hold', 'block'], correct: 'lien',
    explanation: '"Place a lien on" — borcun ödənilməsini təmin etmək üçün mülkiyyət üzərindəki hüquq.',
  },
  {
    id: 2012, type: 'collocation', topic: 'Court & Litigation',
    question: 'The court granted an injunction to ___ the defendant from continuing.',
    az: 'Məhkəmə cavabdehin davam etməsinin ___ üçün qadağa verdi.',
    options: ['restrain', 'stop of', 'prevent of', 'block'], correct: 'restrain',
    explanation: '"Restrain the defendant from" — qadağa qərarlarında işlənən standart hüquqi dil.',
  },
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildQuestions(activeTopics: string[] | null): MockQ[] {
  const allVocab = vocabData as VocabItem[]
  // Mövzuya uyğun vocab — əgər topics varsa filtr et, yoxsa hamısı
  const filteredVocab = activeTopics
    ? allVocab.filter(v => activeTopics.includes(v.topic))
    : allVocab
  const vocabPool = filteredVocab.length >= 4 ? filteredVocab : allVocab

  // Mövzuya uyğun kollokasiya sualları
  const collocationPool = activeTopics
    ? COLLOCATION_QUESTIONS.filter(q => activeTopics.includes(q.topic))
    : COLLOCATION_QUESTIONS
  const finalCollocationPool = collocationPool.length >= 3 ? collocationPool : COLLOCATION_QUESTIONS

  // Mövzuya uyğun qrammatika (qrammatika mövzudan asılı deyil — hamısı qalır)
  const grammarPool = GRAMMAR_QUESTIONS

  // 4 lüğət (definition → term)
  const vocabQs: MockQ[] = shuffle(vocabPool).slice(0, 4).map(v => {
    const same = allVocab.filter(x => x.id !== v.id && x.topic === v.topic)
    const any = allVocab.filter(x => x.id !== v.id)
    const distractors = shuffle(same.length >= 3 ? same : any).slice(0, 3).map(x => x.term)

    // AZ: yalnız izah hissəsi — "Term – izah" formatından termini sil, cavabı açıqlama
    const azParts = v.az_translation.split(' – ')
    const azDefOnly = azParts.length > 1 ? azParts.slice(1).join(' – ') : v.az_translation

    return {
      id: v.id,
      type: 'vocabulary' as const,
      topic: v.topic,
      question: v.en_def,
      az: azDefOnly,
      options: shuffle([v.term, ...distractors]),
      correct: v.term,
      explanation: `${v.term}: ${v.az_translation}`,
    }
  })

  // 3 qrammatika (mövzudan asılı deyil)
  const grammarQs: MockQ[] = shuffle(grammarPool).slice(0, 3).map(q => ({
    ...q, options: shuffle(q.options),
  }))

  // 3 kollokasiya (mövzuya uyğun)
  const collocationQs: MockQ[] = shuffle(finalCollocationPool).slice(0, 3).map(q => ({
    ...q, options: shuffle(q.options),
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

function MockTestContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topicsParam = searchParams.get('topics')
  const activeTopics = topicsParam ? topicsParam.split(',') : null

  const initialQuestions = useMemo(() => buildQuestions(activeTopics), [activeTopics?.join(',')])
  const TOTAL_UNIQUE = initialQuestions.length  // 10

  // Aktiv sual növbəsi (yanlış cavablar sonra əlavə olunur)
  const [queue, setQueue] = useState<MockQ[]>(initialQuestions)
  // Unikal sualların ID-ləri — mənimsənilənlər
  const [mastered, setMastered] = useState<Set<number>>(new Set())
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [showAz, setShowAz] = useState(false)

  const current = queue[qIdx]
  // Cavab variantlarının yerləri hər dəfə sual ekrana gələndə yenidən qarışsın —
  // eyni sual təkrar gələndə (səhv cavabdan sonra) variantlar fərqli sırada olsun.
  // qIdx-ə bağlı useMemo: hər yeni mövqedə təzə qarışma, amma eyni sual ekranda
  // olarkən (seç, "Mənası" aç və s. re-render-lərdə) sıra sabit qalsın.
  const displayedOptions = useMemo(
    () => (current ? shuffle(current.options) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qIdx, current?.id]
  )
  // Real-time faiz: neçə unikal sual mənimsənildi
  const progressPct = Math.round((mastered.size / TOTAL_UNIQUE) * 100)

  function select(opt: string) {
    if (selected) return
    setSelected(opt)
    const correct = opt === current.correct

    if (correct) {
      // Mənimsənildi — dərhal score yaz (geri bassanı belə qalsın)
      setMastered(prev => {
        const next = new Set(prev)
        next.add(current.id)
        const newScore = Math.round((next.size / TOTAL_UNIQUE) * 100)
        saveSessionScore('night', newScore)
        return next
      })
    } else {
      // Yanlış — sualı növbənin random yerinə (növbəti 3 sual arası) əlavə et
      setQueue(prev => {
        const remaining = prev.slice(qIdx + 1)
        const insertAt = Math.min(
          Math.floor(Math.random() * 3) + 1,
          remaining.length
        )
        const next = [...remaining]
        next.splice(insertAt, 0, { ...current, options: shuffle(current.options) })
        return [...prev.slice(0, qIdx + 1), ...next]
      })
    }
  }

  function next() {
    const nextIdx = qIdx + 1
    // Bütün unikal suallar mənimsənilibsə (yanlış cavab verməyənlər) bitir
    // YA DA növbə qurtarıbsa bitir
    if (nextIdx >= queue.length || mastered.size === TOTAL_UNIQUE) {
      const score = Math.round((mastered.size / TOTAL_UNIQUE) * 100)
      saveSessionScore('night', score)
      setDone(true)
    } else {
      setQIdx(nextIdx)
      setSelected(null)
      setShowAz(false)
    }
  }

  const finalPct = done ? Math.round((mastered.size / TOTAL_UNIQUE) * 100) : 0

  // ─── Header ────────────────────────────────────────────
  const header = (
    <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center justify-between">
      <button onClick={() => router.push('/dashboard')} className="text-sm font-medium text-blue-600 hover:text-blue-800">🏠 Ana Səhifə</button>
      <span className="font-semibold text-gray-900 dark:text-white text-sm">🌙 TOLES Mock Test</span>
      <span className="text-sm text-gray-400">{done ? '✓' : `${mastered.size}/${TOTAL_UNIQUE} ✓`}</span>
    </header>
  )

  // ─── Nəticə ────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        {header}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="card max-w-sm w-full text-center">
            <div className="text-5xl mb-3">{finalPct >= 80 ? '🏆' : finalPct >= 60 ? '👍' : '💪'}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">TOLES Mock Test</h2>
            <p className="text-3xl font-bold text-blue-600 mb-1">{mastered.size}/{TOTAL_UNIQUE}</p>
            <p className="text-gray-500 mb-1">Mənimsənildi: <strong>{finalPct}%</strong></p>
            <p className="text-xs text-gray-400 mb-5">Günlük töhfə: {Math.round(finalPct * 25 / 100)}% (25%-dən)</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-6">
              <div className={`h-3 rounded-full ${finalPct >= 80 ? 'bg-green-500' : finalPct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${finalPct}%` }} />
            </div>
            <div className="space-y-2 mb-6 text-left">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                💡 Yanlış cavab verdiyin suallar o gün dəfələrlə qarşına çıxdı. Mənimsəmədiklərini sabah yenidən sınaya bilərsən.
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 mb-6">
              💡 TOLES: Lüğət + Qrammatika + Kollokasiya — bu test həmin formatı simulyasiya edir.
            </div>
            <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">Ana Səhifəyə Qayıt →</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Test ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {header}
      {/* Progress: mənimsənilən/cəmi */}
      <div className="h-2 bg-gray-200">
        <div className="h-2 bg-indigo-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="px-4 py-1.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
        <span>✓ Mənimsənildi: <strong className="text-green-600">{mastered.size}/{TOTAL_UNIQUE}</strong></span>
        <span className="font-medium text-indigo-600">{progressPct}%</span>
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {/* Tip + mövzu */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLOR[current.type]}`}>
            {TYPE_LABEL[current.type]}
          </span>
          <span className="text-xs text-gray-400">{current.topic}</span>
          {selected && !mastered.has(current.id) && (
            <span className="text-xs text-amber-600 font-medium">🔄 Yenidən qarşına çıxacaq</span>
          )}
        </div>

        {/* Sual + 2 düymə */}
        <div className="card mb-6">
          <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed mb-4">
            {current.question}
          </p>

          {/* Audio + AZ düymələri */}
          <div className="flex items-center gap-2">
            <AudioPlayer word={current.question.replace(/___/g, '')} variant="sentence" isSentence={true} />
            <button
              onClick={() => setShowAz(s => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showAz
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900'
              }`}
              title="Azərbaycan dilində mənasını göstər"
            >
              🗝️ {showAz ? 'Gizlət' : 'Mənası'}
            </button>
          </div>

          {/* AZ tərcümə */}
          {showAz && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                🇦🇿 {current.az}
              </p>
            </div>
          )}
        </div>

        {/* Variantlar */}
        <div className="space-y-3 mb-6">
          {displayedOptions.map((opt) => {
            const isCorrect = opt === current.correct
            const isSelected = opt === selected
            let cls = 'flex items-center gap-2 w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all '
            if (!selected) cls += 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950'
            else if (isCorrect) cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
            else if (isSelected) cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
            else cls += 'border-gray-200 dark:border-gray-700 opacity-40'
            return (
              <div key={opt} className={cls}>
                <button onClick={() => select(opt)} className="flex-1 text-left bg-transparent">
                  {selected && isCorrect ? '✓ ' : selected && isSelected ? '✗ ' : ''}{opt}
                </button>
                {/* Səsləndirmə — sağda, variant sözünü/ifadəsini dinlə (seçimi tetiklətmir) */}
                <AudioPlayer word={opt} variant="icon" />
              </div>
            )
          })}
        </div>

        {/* Cavab sonrası izah */}
        {selected && (
          <>
            <div className={`mb-4 p-3 rounded-xl text-sm text-center font-medium ${
              selected === current.correct
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}>
              {selected === current.correct ? '✓ Düzgün!' : '✗ Yanlış — yenidən qarşına çıxacaq 🔄'}
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">💡 İzah:</p>
              <p className="text-sm text-indigo-800 dark:text-indigo-200">{current.explanation}</p>
            </div>
            <button onClick={next} className="btn-primary w-full">
              {mastered.size === TOTAL_UNIQUE || qIdx + 1 >= queue.length ? 'Nəticəni gör →' : 'Növbəti sual →'}
            </button>
          </>
        )}
      </main>
      <AITutorChat level="B2" />
    </div>
  )
}

export default function MockTestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>}>
      <MockTestContent />
    </Suspense>
  )
}
