// ─── AI Müəllim — Gemini (BYOK: hər user öz pulsuz açarını gətirir) ───
// Açar user-in brauzerində (localStorage) saxlanır, serverə getmir.

const KEY_STORAGE = 'best_english_gemini_key'
const MODEL = 'gemini-2.0-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

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

// ─── Əsas çağırış ──────────────────────────────────────
export async function callGemini(
  systemPrompt: string,
  messages: AIMessage[]
): Promise<string> {
  const key = getApiKey()
  if (!key) throw new Error('NO_KEY')

  const res = await fetch(`${ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 400 && errText.includes('API_KEY')) throw new Error('BAD_KEY')
    if (res.status === 429) throw new Error('RATE_LIMIT')
    throw new Error(`AI xətası (${res.status})`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Boş cavab gəldi')
  return text.trim()
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
