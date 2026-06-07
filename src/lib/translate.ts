// Pulsuz, açarsız tərcümə — Google Translate-in açıq "gtx" son nöqtəsi.
// Yalnız klient tərəfdə işlədilir (sual mətnini tələb üzrə Azərbaycan dilinə çevirir).

const cache = new Map<string, string>()

export async function translateToAz(text: string): Promise<string> {
  const key = text.trim()
  if (!key) return ''
  const cached = cache.get(key)
  if (cached) return cached

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=az&dt=t&q=${encodeURIComponent(key)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('TRANSLATE_FAILED')

  const data = await res.json()
  const translated = (data?.[0] ?? [])
    .map((chunk: any[]) => chunk?.[0] ?? '')
    .join('')
    .trim()

  if (!translated) throw new Error('TRANSLATE_EMPTY')
  cache.set(key, translated)
  return translated
}
