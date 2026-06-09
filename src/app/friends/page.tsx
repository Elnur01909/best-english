'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, getUserProfile } from '@/lib/supabase'
import {
  searchUserByEmail, sendFriendRequest, getIncomingRequests, getOutgoingRequests,
  respondToFriendRequest, cancelFriendRequest, getFriends,
} from '@/lib/social'
import { createBattle, getIncomingBattles, getActiveBattles, respondToBattle, subscribeToIncomingBattles, BATTLE_LEVEL_LABEL } from '@/lib/battles'
import { LEVEL_COLORS, TOLES_COLORS } from '@/lib/utils'
import type { FriendProfile, BattleLevel, Battle } from '@/types'

type Tab = 'friends' | 'requests' | 'search'

// Ümumi ingilis CEFR səviyyələri
const GENERAL_LEVELS: { level: string; label: string; color: string; desc: string }[] = [
  { level: 'A1', label: 'A1', color: 'bg-green-500',   desc: 'Başlanğıc' },
  { level: 'A2', label: 'A2', color: 'bg-emerald-600', desc: 'Elementar' },
  { level: 'B1', label: 'B1', color: 'bg-teal-600',    desc: 'Orta' },
  { level: 'B2', label: 'B2', color: 'bg-blue-600',    desc: 'Yuxarı-orta' },
  { level: 'C1', label: 'C1', color: 'bg-indigo-600',  desc: 'İrəli' },
]

// TOLES hüquqi ingilis səviyyələri
const TOLES_LEVELS: { level: string; label: string; color: string; desc: string }[] = [
  { level: 'F', label: 'Foundation', color: 'bg-teal-500',  desc: 'B1 · TOLES' },
  { level: 'H', label: 'Higher',     color: 'bg-blue-500',  desc: 'B2 · TOLES' },
  { level: 'A', label: 'Advanced',   color: 'bg-red-500',   desc: 'C1 · TOLES' },
]

export default function FriendsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('friends')
  const [loading, setLoading] = useState(true)

  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [incoming, setIncoming] = useState<any[]>([])
  const [outgoing, setOutgoing] = useState<any[]>([])

  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState<FriendProfile | null | 'not_found'>(null)
  const [searching, setSearching] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const [incomingBattles, setIncomingBattles] = useState<any[]>([])
  const [activeBattles, setActiveBattles] = useState<Battle[]>([])
  const [challenging, setChallenging] = useState<string | null>(null)

  // ─── Level seçim modalı üçün state ─────────────────────
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null)
  const [battleTrack, setBattleTrack] = useState<'general' | 'legal'>('general')
  const [battleLevel, setBattleLevel] = useState<BattleLevel>('A1')

  const reload = useCallback(async (uid: string) => {
    const [{ data: f }, { data: inc }, { data: out }, { data: ib }, { data: ab }] = await Promise.all([
      getFriends(uid),
      getIncomingRequests(uid),
      getOutgoingRequests(uid),
      getIncomingBattles(uid),
      getActiveBattles(uid),
    ])
    setFriends(f ?? [])
    setIncoming(inc ?? [])
    setOutgoing(out ?? [])
    setIncomingBattles(ib ?? [])
    setActiveBattles(ab ?? [])
  }, [])

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await reload(user.id)
      setLoading(false)
    }
    load()
  }, [router, reload])

  // Yeni yarış dəvəti gələndə canlı bildiriş
  useEffect(() => {
    if (!userId) return
    const unsubscribe = subscribeToIncomingBattles(userId, () => reload(userId))
    return unsubscribe
  }, [userId, reload])

  async function handleSearch() {
    if (!userId || !searchEmail.trim()) return
    setSearching(true)
    setSearchResult(null)
    setActionMsg(null)
    const { data } = await searchUserByEmail(searchEmail, userId)
    setSearchResult(data ?? 'not_found')
    setSearching(false)
  }

  async function handleSendRequest(receiverId: string) {
    if (!userId) return
    setActionMsg(null)
    const { error } = await sendFriendRequest(userId, receiverId)
    if (error) {
      setActionMsg(error.code === '23505' ? 'Artıq sorğu göndərmisən və ya dostsunuz.' : 'Xəta baş verdi.')
    } else {
      setActionMsg('✓ Dostluq sorğusu göndərildi!')
      await reload(userId)
    }
  }

  async function handleRespond(requestId: string, accept: boolean) {
    if (!userId) return
    await respondToFriendRequest(requestId, accept)
    await reload(userId)
  }

  async function handleCancel(requestId: string) {
    if (!userId) return
    await cancelFriendRequest(requestId)
    await reload(userId)
  }

  // Dostun profilinə tıklandıqda modal aç
  function openChallengeModal(friend: FriendProfile) {
    setChallengeTarget({ id: friend.id, name: friend.display_name || friend.email || 'Dost' })
    setBattleTrack('general')
    setBattleLevel('A1')
  }

  async function handleChallenge() {
    if (!userId || !challengeTarget) return
    setChallenging(challengeTarget.id)
    const { data, error } = await createBattle(userId, challengeTarget.id, battleLevel)
    setChallenging(null)
    setChallengeTarget(null)
    if (data && !error) router.push(`/battles/${data.id}`)
  }

  async function handleBattleRespond(battleId: string, accept: boolean) {
    const { data } = await respondToBattle(battleId, accept)
    if (accept && data) router.push(`/battles/${battleId}`)
    else if (userId) await reload(userId)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500">← Geri</button>
          <h1 className="font-bold text-gray-900 dark:text-white">👥 Dostlar</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ─── Yarış dəvətləri (varsa, ən üstdə vurğulanır) ─── */}
        {incomingBattles.length > 0 && (
          <div className="space-y-2">
            {incomingBattles.map((b) => (
              <div key={b.id} className="card bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800">
                <p className="text-sm text-amber-900 dark:text-amber-100 mb-1">
                  🏆 <strong>{b.creator?.display_name || b.creator?.email || 'Bir dostun'}</strong> səni yarışa çağırır!
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  📊 Səviyyə: <strong>{BATTLE_LEVEL_LABEL[b.toles_level] ?? b.toles_level}</strong>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleBattleRespond(b.id, true)} className="btn-primary flex-1 text-sm py-2">
                    ⚔️ Qəbul et və başla
                  </button>
                  <button onClick={() => handleBattleRespond(b.id, false)} className="btn-secondary px-4 text-sm py-2">
                    Rədd et
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Davam edən yarışlar ─── */}
        {activeBattles.length > 0 && (
          <div className="space-y-2">
            {activeBattles.map((b) => (
              <button
                key={b.id}
                onClick={() => router.push(`/battles/${b.id}`)}
                className="card w-full text-left bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800 hover:shadow-md transition-shadow"
              >
                <p className="text-sm text-green-900 dark:text-green-100">
                  ⚔️ Davam edən yarış var
                  {' · '}<span className="font-medium">{BATTLE_LEVEL_LABEL[b.toles_level] ?? b.toles_level}</span>
                  {' '}— davam etmək üçün toxun →
                </p>
              </button>
            ))}
          </div>
        )}

        {/* ─── Tablar ─── */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
          {([
            ['friends', `Dostlar (${friends.length})`],
            ['requests', `Sorğular ${incoming.length > 0 ? `(${incoming.length})` : ''}`],
            ['search', 'Axtar'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setActionMsg(null) }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Dostlar siyahısı ─── */}
        {tab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0 && (
              <div className="card text-center text-gray-500 text-sm py-8">
                Hələ dostun yoxdur. <button onClick={() => setTab('search')} className="text-blue-600 font-medium">Email ilə axtar →</button>
              </div>
            )}
            {friends.map((f) => (
              <div key={f.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-lg shrink-0">
                  {(f.display_name || f.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{f.display_name || f.email}</p>
                  <div className="flex gap-1.5 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[f.level]}`}>{f.level}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${TOLES_COLORS[f.toles_level]}`}>{f.toles_level}</span>
                    <span className="text-xs text-orange-500">🔥 {f.streak}</span>
                  </div>
                </div>
                <button
                  onClick={() => openChallengeModal(f)}
                  disabled={challenging === f.id}
                  className="btn-primary text-sm px-3 py-2 shrink-0"
                >
                  {challenging === f.id ? '...' : '⚔️ Yarışa çağır'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ─── Gələn / göndərilən sorğular ─── */}
        {tab === 'requests' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Gələn sorğular</h3>
              {incoming.length === 0 && <p className="text-sm text-gray-400">Yeni sorğu yoxdur.</p>}
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {r.sender?.display_name || r.sender?.email}
                      </p>
                      <p className="text-xs text-gray-400">{r.sender?.level} · {r.sender?.toles_level}</p>
                    </div>
                    <button onClick={() => handleRespond(r.id, true)} className="btn-primary text-sm px-3 py-1.5">Qəbul et</button>
                    <button onClick={() => handleRespond(r.id, false)} className="btn-secondary text-sm px-3 py-1.5">Rədd et</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Göndərdiyim sorğular</h3>
              {outgoing.length === 0 && <p className="text-sm text-gray-400">Göndərilən sorğu yoxdur.</p>}
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div key={r.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {r.receiver?.display_name || r.receiver?.email}
                      </p>
                      <p className="text-xs text-gray-400">Gözlənilir...</p>
                    </div>
                    <button onClick={() => handleCancel(r.id)} className="btn-secondary text-sm px-3 py-1.5">Ləğv et</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Email ilə axtarış ─── */}
        {tab === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="dostunun@email.com"
                className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
              />
              <button onClick={handleSearch} disabled={searching || !searchEmail.trim()} className="btn-primary px-5">
                {searching ? '...' : 'Axtar'}
              </button>
            </div>

            {actionMsg && (
              <div className="text-sm text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {actionMsg}
              </div>
            )}

            {searchResult === 'not_found' && (
              <p className="text-center text-sm text-gray-400 py-4">Bu email ilə istifadəçi tapılmadı.</p>
            )}

            {searchResult && searchResult !== 'not_found' && (
              <div className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-lg shrink-0">
                  {(searchResult.display_name || searchResult.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {searchResult.display_name || searchResult.email}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[searchResult.level]}`}>{searchResult.level}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${TOLES_COLORS[searchResult.toles_level]}`}>{searchResult.toles_level}</span>
                  </div>
                </div>
                <button onClick={() => handleSendRequest(searchResult.id)} className="btn-primary text-sm px-3 py-2 shrink-0">
                  + Dostluq sorğusu
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              💡 Dostunun tam email ünvanını yaz — axtarış dəqiq uyğunluğa görə işləyir.
            </p>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════
          Level Seçim Modalı — "Yarışa çağır" tıklandığında
      ══════════════════════════════════════════════════════ */}
      {challengeTarget && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 sm:items-center px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setChallengeTarget(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">

            {/* Başlıq */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">⚔️ Yarış Səviyyəsi</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="font-medium text-blue-600">{challengeTarget.name}</span> ilə yarışmaq
                </p>
              </div>
              <button
                onClick={() => setChallengeTarget(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Trək seçimi (Ümumi / TOLES) */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4">
              <button
                onClick={() => { setBattleTrack('general'); setBattleLevel('A1') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  battleTrack === 'general'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                📚 Ümumi İngilis
              </button>
              <button
                onClick={() => { setBattleTrack('legal'); setBattleLevel('F') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  battleTrack === 'legal'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                ⚖️ TOLES
              </button>
            </div>

            {/* CEFR səviyyələri (Ümumi trək) */}
            {battleTrack === 'general' && (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {GENERAL_LEVELS.map(({ level, label, color, desc }) => (
                  <button
                    key={level}
                    onClick={() => setBattleLevel(level as BattleLevel)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                      battleLevel === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <span className={`text-xs font-bold text-white px-1.5 py-0.5 rounded-md ${color}`}>
                      {label}
                    </span>
                    <span className="text-xs text-gray-400 leading-none">{desc}</span>
                  </button>
                ))}
              </div>
            )}

            {/* TOLES səviyyələri */}
            {battleTrack === 'legal' && (
              <div className="space-y-2 mb-4">
                {TOLES_LEVELS.map(({ level, label, color, desc }) => (
                  <button
                    key={level}
                    onClick={() => setBattleLevel(level as BattleLevel)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      battleLevel === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <span className={`text-xs font-bold text-white px-2 py-1 rounded-lg ${color}`}>
                      {label[0]}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    {battleLevel === level && (
                      <span className="ml-auto text-blue-500">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Seçilmiş səviyyə — qısa xülasə */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500">
                Seçilmiş səviyyə: <span className="font-semibold text-gray-900 dark:text-white">
                  {BATTLE_LEVEL_LABEL[battleLevel] ?? battleLevel}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">8 sual · 30 saniyə hər sual üçün</p>
            </div>

            {/* Düymələr */}
            <div className="flex gap-2">
              <button
                onClick={() => setChallengeTarget(null)}
                className="btn-secondary flex-1"
              >
                Ləğv et
              </button>
              <button
                onClick={handleChallenge}
                disabled={challenging === challengeTarget.id}
                className="btn-primary flex-1"
              >
                {challenging === challengeTarget.id ? '...' : '⚔️ Çağır'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
