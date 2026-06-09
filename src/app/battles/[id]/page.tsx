'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getUser, getUserProfile } from '@/lib/supabase'
import {
  getBattle, getBattleQuestions, getBattleAnswers, submitBattleAnswer,
  completeBattle, subscribeToBattle, BATTLE_LEVEL_LABEL,
} from '@/lib/battles'
import ProfessorWidget from '@/components/ProfessorWidget'
import AudioPlayer from '@/components/AudioPlayer'
import type { Battle, BattleAnswer, QuizQuestion, UserProfile } from '@/types'

interface PlayerState {
  id: string
  name: string
  answeredCount: number
  correctCount: number
}

const TIME_PER_QUESTION = 30 // hər sual üçün saniyə
const TIMEOUT_SENTINEL = '__TIMEOUT__'

export default function BattlePage() {
  const router = useRouter()
  const params = useParams()
  const battleId = String(params.id)

  const [userId, setUserId] = useState<string | null>(null)
  const [battle, setBattle] = useState<Battle | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [myAnswers, setMyAnswers] = useState<BattleAnswer[]>([])
  const [oppAnswers, setOppAnswers] = useState<BattleAnswer[]>([])
  const [oppName, setOppName] = useState('Rəqib')
  const questionStartRef = useRef<number>(Date.now())
  const finishedRef = useRef(false)

  const opponentId = battle && userId ? (battle.creator_id === userId ? battle.opponent_id : battle.creator_id) : null

  const loadAnswers = useCallback(async (uid: string, oppId: string) => {
    const { data } = await getBattleAnswers(battleId)
    if (!data) return
    setMyAnswers(data.filter((a) => a.user_id === uid))
    setOppAnswers(data.filter((a) => a.user_id === oppId))
  }, [battleId])

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: b } = await getBattle(battleId)
      if (!b) { setNotFound(true); setLoading(false); return }
      setBattle(b)

      const oppId = b.creator_id === user.id ? b.opponent_id : b.creator_id
      const { data: oppProfile } = await getUserProfile(oppId)
      if (oppProfile) setOppName((oppProfile as UserProfile).display_name || (oppProfile as UserProfile).email || 'Rəqib')

      setQuestions(getBattleQuestions(b.question_ids))
      await loadAnswers(user.id, oppId)
      questionStartRef.current = Date.now()
      setLoading(false)
    }
    load()
  }, [battleId, router, loadAnswers])

  // Realtime: rəqibin cavabları + yarış statusu
  useEffect(() => {
    if (!userId || !opponentId) return
    const unsubscribe = subscribeToBattle(
      battleId,
      (row) => {
        if (row.user_id === opponentId) setOppAnswers((prev) => [...prev, row])
        else if (row.user_id === userId) setMyAnswers((prev) => (prev.some(a => a.q_index === row.q_index) ? prev : [...prev, row]))
      },
      (row) => setBattle(row)
    )
    return unsubscribe
  }, [battleId, userId, opponentId])

  const current = questions[qIdx]
  const myScore = myAnswers.filter((a) => a.correct).length
  const oppScore = oppAnswers.filter((a) => a.correct).length
  const total = questions.length
  const iAmDone = myAnswers.length >= total && total > 0
  const oppDone = oppAnswers.length >= total && total > 0

  // Hər iki tərəf bitirəndə yarışı tamamla
  useEffect(() => {
    if (iAmDone && oppDone && battle?.status === 'active' && !finishedRef.current) {
      finishedRef.current = true
      completeBattle(battleId)
    }
  }, [iAmDone, oppDone, battle?.status, battleId])

  function answer(opt: string) {
    if (selected || !current || !userId) return
    setSelected(opt)
    const correct = opt === current.correct
    const timeTaken = Date.now() - questionStartRef.current
    const rec = { battle_id: battleId, user_id: userId, q_index: qIdx, correct, time_taken_ms: timeTaken }
    setMyAnswers((prev) => [...prev, rec as BattleAnswer])
    submitBattleAnswer(rec)
  }

  // Cavab seçiləndən (və ya vaxt bitəndən) sonra qısa fasilə ilə növbəti suala keç
  useEffect(() => {
    if (!selected) return
    const t = setTimeout(() => {
      setSelected(null)
      setQIdx((i) => i + 1)
      questionStartRef.current = Date.now()
    }, 1100)
    return () => clearTimeout(t)
  }, [selected])

  // Hər sual üçün 30 saniyəlik geri sayım — cavab veriləndə dayanır
  useEffect(() => {
    if (!current || selected) return
    setTimeLeft(TIME_PER_QUESTION)
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [qIdx, current, selected])

  // Vaxt bitəndə: sual hələ cavablanmayıbsa "cavabsız" (yanlış) kimi qeyd et və avtomatik keç
  useEffect(() => {
    if (timeLeft > 0 || selected || !current || !userId) return
    const timeTaken = Date.now() - questionStartRef.current
    const rec = { battle_id: battleId, user_id: userId, q_index: qIdx, correct: false, time_taken_ms: timeTaken }
    setSelected(TIMEOUT_SENTINEL)
    setMyAnswers((prev) => (prev.some((a) => a.q_index === qIdx) ? prev : [...prev, rec as BattleAnswer]))
    submitBattleAnswer(rec)
  }, [timeLeft, selected, current, userId, qIdx, battleId])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yüklənir...</div>
  if (notFound || !battle) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yarış tapılmadı.</div>

  if (battle.status === 'declined' || battle.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🚫</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Bu yarış ləğv edilib və ya rədd olunub.</p>
          <button onClick={() => router.push('/friends')} className="btn-primary w-full">Dostlara qayıt</button>
        </div>
      </div>
    )
  }

  // ─── Nəticə ekranı ────────────────────────────────────
  if (battle.status === 'completed' || (iAmDone && oppDone)) {
    const won = myScore > oppScore
    const tie = myScore === oppScore
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-5xl mb-3">{won ? '🏆' : tie ? '🤝' : '🐣'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {won ? 'Sən qazandın!' : tie ? 'Bərabərə!' : 'Bu dəfə alınmadı'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {won ? 'Növbəti dəfə də göstər! 💪' : tie ? 'Çox yaxın yarış oldu — təkrar sına!' : 'Heç bir öyrənmə hədər getmir — davam et!'}
          </p>
          <div className="flex justify-around mb-6">
            <div>
              <p className="text-3xl font-bold text-blue-600">{myScore}/{total}</p>
              <p className="text-xs text-gray-400 mt-1">Sən</p>
            </div>
            <div className="text-2xl text-gray-300 self-center">:</div>
            <div>
              <p className="text-3xl font-bold text-purple-600">{oppScore}/{total}</p>
              <p className="text-xs text-gray-400 mt-1">{oppName}</p>
            </div>
          </div>
          <button onClick={() => router.push('/friends')} className="btn-primary w-full">Dostlara qayıt</button>
        </div>
      </div>
    )
  }

  // ─── Gözləmə (rəqib hələ qoşulmayıb / hazır deyil) ────
  if (battle.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">{oppName} dəvəti qəbul etməsini gözləyirik...</p>
        </div>
      </div>
    )
  }

  // ─── Aktiv yarış ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-blue-600">⚔️ Mini-Test Yarışı</span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {BATTLE_LEVEL_LABEL[battle.toles_level] ?? battle.toles_level}
          </span>
        </div>
        {/* Canlı tablo */}
        <div className="max-w-2xl mx-auto flex items-center justify-around mt-2 text-sm">
          <div className="text-center">
            <p className="font-bold text-blue-600">{myScore} <span className="text-gray-400 font-normal">/ {myAnswers.length}</span></p>
            <p className="text-xs text-gray-400">Sən {iAmDone && '✓'}</p>
          </div>
          <div className="text-gray-300">vs</div>
          <div className="text-center">
            <p className="font-bold text-purple-600">{oppScore} <span className="text-gray-400 font-normal">/ {oppAnswers.length}</span></p>
            <p className="text-xs text-gray-400">{oppName} {oppDone && '✓'}</p>
          </div>
        </div>
      </header>
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-blue-500 transition-all" style={{ width: `${(qIdx / total) * 100}%` }} />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        {iAmDone ? (
          <div className="card max-w-sm w-full text-center">
            <div className="text-4xl mb-3 animate-pulse">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">Sualları bitirdin! {oppName} bitirənə qədər gözlə...</p>
            <p className="text-sm text-gray-400 mt-2">Hazırkı bal: {myScore}/{total}</p>
          </div>
        ) : current ? (
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-end mb-2">
              <div className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${
                timeLeft <= 10
                  ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 animate-pulse'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                ⏱️ {timeLeft}s
              </div>
            </div>
            <div className="flex items-start gap-3 mb-6">
              <h2 className="flex-1 min-w-0 text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
                {current.question}
              </h2>
              <ProfessorWidget mood={selected ? (selected === current.correct ? 'happy' : 'disappointed') : 'neutral'} />
            </div>
            <div className="space-y-3">
              {current.options.map((opt) => {
                const isCorrect = opt === current.correct
                const isSelected = opt === selected
                let cls = 'flex-1 p-3.5 rounded-xl border-2 text-left font-medium transition-all '
                if (!selected) {
                  cls += 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                } else if (isCorrect) {
                  cls += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300'
                } else if (isSelected) {
                  cls += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300'
                } else {
                  cls += 'border-gray-200 dark:border-gray-700 opacity-50'
                }
                return (
                  <div key={opt} className="flex items-center gap-2">
                    <button onClick={() => answer(opt)} className={cls} disabled={!!selected}>
                      {selected && isCorrect ? '✓ ' : selected && isSelected ? '✗ ' : ''}{opt}
                    </button>
                    <AudioPlayer word={opt} variant="icon" />
                  </div>
                )
              })}
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              {selected === TIMEOUT_SENTINEL ? '⏰ Vaxt bitdi — cavab verilmədi' : `${qIdx + 1} / ${total}`}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  )
}
