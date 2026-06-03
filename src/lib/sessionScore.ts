// Session nəticələrini localStorage-da saxla
// Format: { "2026-06-04": { morning: 85, midday: 100, evening: 70, night: 80 } }

const SCORE_KEY = 'be_session_scores'

function getAllScores(): Record<string, Record<string, number>> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{}') } catch { return {} }
}

export function saveSessionScore(sessionId: string, score: number) {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().slice(0, 10)
  const all = getAllScores()
  all[today] = { ...all[today], [sessionId]: Math.round(score) }
  // Son 7 günü saxla
  const keys = Object.keys(all).sort()
  if (keys.length > 7) delete all[keys[0]]
  localStorage.setItem(SCORE_KEY, JSON.stringify(all))
}

export function getTodayScores(): Record<string, number> {
  const today = new Date().toISOString().slice(0, 10)
  return getAllScores()[today] ?? {}
}

// Günlük ümumi faiz: hər session max 25% verir
// daily% = Σ (session_score × 25%) / 100
export function getDailyPct(sessionIds: string[]): number {
  const scores = getTodayScores()
  const total = sessionIds.reduce((sum, id) => {
    const s = scores[id] ?? 0
    return sum + (s * 25) / 100
  }, 0)
  return Math.round(total)
}
