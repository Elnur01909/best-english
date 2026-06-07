// Tələffüz uyğunluğu — Levenshtein redaktə məsafəsi + Soundex fonetik kodu
//
// ƏVVƏLKİ VERSİYANIN PROBLEMİ: sadə alt-sətir yoxlanışı
//   normTerm.includes(heard) || heard.includes(normTerm)
// "negligence" / "neglect", "liable" / "liability" kimi eyni kökdən gələn
// AMMA FƏRQLİ sözləri "düzgün" sayırdı (yanlış-müsbət), eyni zamanda Web
// Speech API nadir hüquqi terminləri tez-tez tanış sözlərə "düzəltdiyi"
// üçün tam uyğunluq tələbi düzgün tələffüzü "yanlış" sayırdı (yanlış-mənfi).
//
// Bu modul ikisinin yerinə davamlı oxşarlıq xalı (0–1) hesablayır:
//   1) Levenshtein nisbəti — neçə hərf fərqi var (kiçik ASR yazım fərqlərinə dözümlü)
//   2) Soundex — sözlər YAZILIŞCA fərqli, amma SƏSCƏ yaxın olduqda tutur
// Hədd dəyərləri "neglect"-i "negligence"-dən ayırd edəcək qədər sərt,
// kiçik tələffüz/tanıma fərqlərini qəbul edəcək qədər yumşaqdır.

export function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z\s]/g, '')
}

function compact(s: string): string {
  return s.replace(/\s+/g, '')
}

// Levenshtein redaktə məsafəsi — a-nı b-yə çevirmək üçün neçə tək-hərf əməliyyatı lazımdır
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)

  for (let i = 1; i <= m; i++) {
    let prevDiag = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prevDiag, dp[j], dp[j - 1])
      prevDiag = temp
    }
  }
  return dp[n]
}

function ratio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// 0–1 oxşarlıq nisbəti. Boşluqlu və boşluqsuz versiyaların maksimumunu götürür,
// çünki ASR çox vaxt tək sözü "in demnity" kimi bir neçə sözə bölür.
export function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  return Math.max(ratio(na, nb), ratio(compact(na), compact(nb)))
}

// Soundex — fonetik kodlaşdırma: oxşar SƏSLƏNƏN sözləri (yazılışı fərqli olsa belə) tutur
export function soundex(s: string): string {
  const str = compact(normalize(s)).toUpperCase()
  if (!str) return ''

  const codes: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  }

  let result = str[0]
  let prevCode = codes[str[0]] ?? ''

  for (let i = 1; i < str.length && result.length < 4; i++) {
    const code = codes[str[i]] ?? ''
    if (code && code !== prevCode) result += code
    if (str[i] !== 'H' && str[i] !== 'W') prevCode = code
  }

  return (result + '000').slice(0, 4)
}

export type MatchTier = 'high' | 'medium' | 'low'

export interface PronunciationResult {
  heard: string          // ən yaxşı uyğun gələn variant
  score: number          // 0–1 oxşarlıq xalı
  tier: MatchTier        // istifadəçiyə göstəriləcək nüanslı qiymət
  isCorrect: boolean     // SRS/statistika üçün ikili nəticə
  phoneticMatch: boolean
}

// ASR-dən gələn bütün alternativlər arasından hədəf terminə ən yaxınını tapıb qiymətləndirir
export function evaluatePronunciation(target: string, alternatives: string[]): PronunciationResult {
  const targetCode = soundex(target)

  let best = alternatives[0] ?? ''
  let bestScore = -1
  let bestPhonetic = false

  for (const alt of alternatives) {
    const score = similarity(target, alt)
    const phoneticMatch = targetCode !== '' && soundex(alt) === targetCode
    // Fonetik uyğunluq varsa, sıralama məqsədilə xala kiçik bonus ver —
    // bu "doğru səslənir, amma fərqli yazılıb" hallarını üstə çıxarır
    const ranking = phoneticMatch ? Math.max(score, 0.65) : score
    if (ranking > bestScore) {
      bestScore = ranking
      best = alt
      bestPhonetic = phoneticMatch
    }
  }

  // QƏSDƏN: son "düzgün/yanlış" qərarı YALNIZ mətn-oxşarlıq xalına əsaslanır.
  // Fonetik (Soundex) uyğunluq yalnız ən yaxşı ASR alternativini seçməkdə köməkçidir —
  // ona "düzgün" qərarında çəki vermirik, çünki Soundex çox kobuddur: "negligence" və
  // "neglect" eyni kodu alır (N242), bu da məhz əvvəlki versiyanın yanlış-müsbət
  // probleminin başqa formada təkrarı olardı.
  const score = similarity(target, best)
  const tier: MatchTier = score >= 0.78 ? 'high' : score >= 0.5 ? 'medium' : 'low'
  const isCorrect = score >= 0.78

  return { heard: best, score, tier, isCorrect, phoneticMatch: bestPhonetic }
}
