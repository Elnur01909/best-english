// ─── AI Müəllim — Hibrid (ortaq açar + BYOK) ───
// 1) User öz açarını əlavə edibsə → birbaşa Gemini (limitsiz, öz kvotası).
// 2) Yoxsa → server ortaq açarla (gündə 15 pulsuz mesaj, sıfır əziyyət).

import { supabase } from '@/lib/supabase'

const KEY_STORAGE = 'best_english_gemini_key'
// Pulsuz tier-də ən yüksək günlük limitli modellər (sıra ilə cəhd edilir)
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash']
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export interface AIMessage {
  role: 'user' | 'model'
  text: string
}

// ─── Açar idarəsi ──────────────────────────────────────
export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY_STORAGE)
}

export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_STORAGE, key.trim())
}

export function clearApiKey(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY_STORAGE)
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

// ─── Əsas çağırış (hibrid) ─────────────────────────────
export async function callGemini(
  systemPrompt: string,
  messages: AIMessage[]
): Promise<string> {
  const key = getApiKey()
  // 1) Öz açarı varsa → birbaşa Gemini (limitsiz)
  if (key) return callDirect(key, systemPrompt, messages)
  // 2) Yoxsa → ortaq hovuz (server, gündə 15 pulsuz)
  return callShared(systemPrompt, messages)
}

// Birbaşa Gemini — istifadəçinin öz açarı ilə
async function callDirect(
  key: string,
  systemPrompt: string,
  messages: AIMessage[]
): Promise<string> {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
  })

  let lastErr: Error = new Error('AI xətası')
  for (const model of MODELS) {
    const res = await fetch(`${ENDPOINT(model)}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (res.ok) {
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text.trim()
      lastErr = new Error('Boş cavab gəldi')
      continue
    }
    const errText = await res.text()
    if (res.status === 400 && errText.includes('API_KEY')) throw new Error('BAD_KEY')
    if (res.status === 404) { lastErr = new Error('MODEL_404'); continue }
    if (res.status === 429) { lastErr = new Error('RATE_LIMIT'); continue }
    lastErr = new Error(`AI xətası (${res.status})`)
  }
  throw lastErr
}

// Ortaq hovuz — server API route (sənin açarın gizli, gündə 15 limit)
async function callShared(systemPrompt: string, messages: AIMessage[]): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) throw new Error('NO_AUTH')

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages, accessToken }),
  })

  if (res.ok) {
    const data = await res.json()
    if (data.text) return data.text
    throw new Error('Boş cavab gəldi')
  }

  const err = await res.json().catch(() => ({}))
  if (err.error === 'SHARED_LIMIT') throw new Error('SHARED_LIMIT') // gündəlik 15 doldu → öz açarını əlavə et
  if (err.error === 'NO_SHARED_KEY') throw new Error('NO_KEY')      // server açarı yoxdur → öz açarını əlavə et
  throw new Error('AI xətası')
}

// ─── Müəllim sistem promptu ────────────────────────────
function teacherSystem(level: string): string {
  return `Sən "Best English" platformasının dəstəkləyici İngilis dili və TOLES (hüquqi İngilis) müəllimisən.
İstifadəçinin səviyyəsi: ${level} (CEFR).

QAYDALAR:
- İzahları AZƏRBAYCAN dilində ver, İngilis nümunələrini İngiliscə saxla.
- Qısa, aydın və ürəkləndirici ol (Growth Mindset). Səhvi cəza kimi yox, öyrənmə fürsəti kimi göstər.
- İstifadəçinin səviyyəsinə uyğun sadə dil işlət.
- Hüquqi terminlərdə dəqiq ol (TOLES konteksti: müqavilə, məhkəmə, əmək hüququ və s.).
- Cavabı 4-6 cümlədən uzun etmə. Lazım olsa nümunə ver.`
}

// ─── 1) Yazını yoxla ───────────────────────────────────
export async function checkWriting(
  word: string,
  definition: string,
  sentence: string,
  level: string
): Promise<string> {
  return callGemini(teacherSystem(level), [
    {
      role: 'user',
      text: `Tələbə "${word}" (${definition}) sözünü işlədərək bu cümləni yazdı:

"${sentence}"

Müəllim kimi qiymətləndir:
1. Cümlə qrammatik düzgündürmü? Səhv varsa düzəlişi göstər.
2. "${word}" sözü düzgün kontekstdə işlənibmi?
3. Bir ürəkləndirici qeyd və lazımsa daha yaxşı nümunə.`,
    },
  ])
}

// ─── 2) Səhvi izah et (quiz) ───────────────────────────
export async function explainQuizError(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  level: string
): Promise<string> {
  return callGemini(teacherSystem(level), [
    {
      role: 'user',
      text: `Test sualı: "${question}"
Düzgün cavab: "${correctAnswer}"
Tələbənin cavabı: "${userAnswer}"

Müəllim kimi izah et:
1. Niyə "${correctAnswer}" düzgündür?
2. Tələbənin cavabı niyə uyğun gəlmir (əgər səhvdirsə)?
3. Bu mövzunu yadda saxlamaq üçün qısa məsləhət.`,
    },
  ])
}

// ─── 3) Chat — Sual-cavab ──────────────────────────────
export async function tutorChat(
  history: AIMessage[],
  level: string
): Promise<string> {
  return callGemini(teacherSystem(level), history)
}

// ─── 4) Mnemonika — "açar söz metodu" ilə yaddaqalan assosiasiya ──
// Yalnız "leech" (4+ dəfə unudulan) sözlər üçün çağırılır və Supabase-də
// (vocab_mnemonics) keşlənir ki, hər söz üçün YALNIZ BİR DƏFƏ AI işlədilsin.
export async function generateMnemonic(term: string, azMeaning: string): Promise<string> {
  return callGemini(
    `Sən yaddaş texnikaları üzrə ekspertsən və "açar söz metodu" (keyword mnemonic) ilə İngilis hüquqi terminlərini Azərbaycan dilində danışanlara yadda saxlatmaq üçün qısa, canlı, vizual assosiasiyalar yaradırsan.`,
    [
      {
        role: 'user',
        text: `İngilis termini: "${term}"
Mənası: ${azMeaning}

Bu söz üçün Azərbaycan dilində QISA (2-3 cümlə), yaddaqalan, vizual bir mnemonika yarat: sözün səslənişi/yazılışı ilə tanış bir Azərbaycan sözü/anlayışı arasında qəribə, gülməli və ya təəccüblü bir əlaqə qur ki, termini bir daha unutmasın. Yalnız mnemonikanın özünü yaz, başqa heç nə əlavə etmə (giriş, başlıq və s. yox).`,
      },
    ]
  )
}
