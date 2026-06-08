'use client'
import { useEffect, useState, useCallback } from 'react'
import { getUser, getUserProfile, getAllVocabProgress } from '@/lib/supabase'
import vocabData from '@/data/vocab.json'
import type { VocabItem, CEFRLevel, LearningTrack } from '@/types'

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const COLOR: Record<string, string> = {
  A1: 'bg-green-500', A2: 'bg-emerald-600', B1: 'bg-teal-600',
  B2: 'bg-blue-600', C1: 'bg-indigo-600', C2: 'bg-red-600',
}
const MASTERED_REPS = 2          // ən azı 2 dəfə düzgün xatırlanan söz "mənimsənilmiş" sayılır
const UNLOCK_PCT = 80            // bir level bu %-ə çatanda növbəti açılır

type Row = { level: CEFRLevel; total: number; mastered: number; pct: number; unlocked: boolean; current: boolean }

export default function CEFRLadder() {
  const [track, setTrack] = useState<LearningTrack>('general')
  const [profLevel, setProfLevel] = useState<CEFRLevel>('A1')
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const u = await getUser()
      if (!u) { setLoading(false); return }
      const { data: prof } = await getUserProfile(u.id)
      const lvl = ((prof?.level as CEFRLevel) || 'A1')
      setProfLevel(lvl)
      const saved = typeof window !== 'undefined' ? localStorage.getItem('best_english_track') : null
      setTrack(saved === 'general' || saved === 'legal' ? saved : (['A1', 'A2', 'B1'].includes(lvl) ? 'general' : 'legal'))
      const progress = await getAllVocabProgress(u.id)
      setMasteredIds(new Set(progress.filter(p => (p.repetitions ?? 0) >= MASTERED_REPS).map(p => p.vocab_id)))
      setLoading(false)
    })()
  }, [])

  const chooseTrack = useCallback((t: LearningTrack) => {
    setTrack(t)
    if (typeof window !== 'undefined') localStorage.setItem('best_english_track', t)
  }, [])

  if (loading) return null

  const vocab = vocabData as VocabItem[]
  const levels = CEFR_ORDER.filter(c => vocab.some(v => (v.track ?? 'legal') === track && v.cefr === c))
  if (levels.length === 0) return null
  const profIdx = CEFR_ORDER.indexOf(profLevel)

  let unlockedByMastery = true
  const rows: Row[] = levels.map((c) => {
    const pool = vocab.filter(v => (v.track ?? 'legal') === track && v.cefr === c)
    const total = pool.length
    const mastered = pool.filter(v => masteredIds.has(v.id)).length
    const pct = total ? Math.round((mastered / total) * 100) : 0
    const cIdx = CEFR_ORDER.indexOf(c)
    const unlocked = cIdx <= profIdx || unlockedByMastery
    const current = c === profLevel
    unlockedByMastery = pct >= UNLOCK_PCT
    return { level: c, total, mastered, pct, unlocked, current }
  })

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="font-semibold text-gray-900 dark:text-white">🪜 Səviyyə Nərdivanı</h2>
        <div className="flex gap-1">
          {(['general', 'legal'] as LearningTrack[]).map(t => (
            <button
              key={t}
              onClick={() => chooseTrack(t)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                track === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              {t === 'general' ? '📚 Ümumi' : '⚖️ Hüquqi'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.level} className={`flex items-center gap-3 p-2 rounded-lg ${r.current ? 'bg-blue-50 dark:bg-blue-950' : ''}`}>
            <span className={`badge text-white border-0 ${COLOR[r.level]} ${!r.unlocked ? 'opacity-40' : ''}`}>{r.level}</span>
            <div className="flex-1 min-w-0">
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full ${COLOR[r.level]} transition-all`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
            <span className="text-xs text-gray-500 w-14 text-right tabular-nums">{r.mastered}/{r.total}</span>
            <span className="text-sm w-5 text-center" title={r.current ? 'Cari səviyyə' : r.pct >= UNLOCK_PCT ? 'Tamamlandı' : !r.unlocked ? 'Bağlı' : 'Açıq'}>
              {r.current ? '📍' : r.pct >= UNLOCK_PCT ? '✓' : !r.unlocked ? '🔒' : '·'}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Bir səviyyəni {UNLOCK_PCT}% mənimsə → növbəti 🔒 açılır. İstənilən vaxt istənilən səviyyəyə baxa bilərsən.
      </p>
    </div>
  )
}
