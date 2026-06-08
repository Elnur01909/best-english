'use client'
// ─── Üzən Yarış Dəvəti Bildirişi ───────────────────────────
// İstifadəçi saytın istənilən səhifəsində olsa belə, bir dostu onu
// canlı TOLES Mini-Test yarışına çağıranda, ekranın küncündə üzən
// bir pəncərə görünür (Qəbul et / Rədd et).
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, getUserProfile } from '@/lib/supabase'
import { subscribeToIncomingBattles, respondToBattle } from '@/lib/battles'
import type { Battle, UserProfile } from '@/types'

export default function BattleChallengePopup() {
  const router = useRouter()
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<Battle | null>(null)
  const [creator, setCreator] = useState<UserProfile | null>(null)
  const [responding, setResponding] = useState(false)

  // Cari istifadəçini tap
  useEffect(() => {
    let active = true
    getUser().then((user) => { if (active && user) setUserId(user.id) })
    return () => { active = false }
  }, [])

  // Gələn yarış dəvətlərinə qlobal abunəlik (hər səhifədə işləyir)
  useEffect(() => {
    if (!userId) return
    const unsubscribe = subscribeToIncomingBattles(userId, async (row) => {
      setChallenge(row)
      const { data } = await getUserProfile(row.creator_id)
      if (data) setCreator(data as UserProfile)
    })
    return unsubscribe
  }, [userId])

  // Artıq həmin yarışın otağındasansa, ya da /friends səhifəsindəsənsə
  // (orada dəvətlər onsuz da kart şəklində görünür) — üzən pəncərəni göstərmə
  useEffect(() => {
    if (challenge && (pathname === `/battles/${challenge.id}` || pathname === '/friends')) {
      setChallenge(null)
      setCreator(null)
    }
  }, [challenge, pathname])

  async function handleAccept() {
    if (!challenge || responding) return
    setResponding(true)
    const { data } = await respondToBattle(challenge.id, true)
    setResponding(false)
    setChallenge(null)
    setCreator(null)
    if (data) router.push(`/battles/${data.id}`)
  }

  async function handleDecline() {
    if (!challenge || responding) return
    setResponding(true)
    await respondToBattle(challenge.id, false)
    setResponding(false)
    setChallenge(null)
    setCreator(null)
  }

  if (!challenge) return null

  const name = creator?.display_name || creator?.email || 'Bir dostun'

  return (
    <div className="fixed bottom-5 right-5 left-5 sm:left-auto z-[200] sm:w-96 max-w-full">
      <div className="bg-white dark:bg-gray-900 border-2 border-amber-300 dark:border-amber-700 shadow-2xl rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl shrink-0 animate-pulse">⚔️</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
              <span className="text-amber-600 dark:text-amber-400">{name}</span> səni canlı yarışa çağırır!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              🏆 TOLES Mini-Test ({challenge.toles_level}) — qəbul etsən dərhal başlayır
            </p>
          </div>
          <button
            onClick={() => { setChallenge(null); setCreator(null) }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none shrink-0"
            aria-label="Bağla"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleAccept} disabled={responding} className="btn-primary flex-1 text-sm py-2">
            {responding ? '...' : '⚔️ Qəbul et və başla'}
          </button>
          <button onClick={handleDecline} disabled={responding} className="btn-secondary px-4 text-sm py-2">
            Rədd et
          </button>
        </div>
      </div>
    </div>
  )
}
