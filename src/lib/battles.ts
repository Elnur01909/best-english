// ─── TOLES Mini-Test Yarışı (real-vaxt) ───────────────
// İki dost eyni sual dəstini paralel həll edir, nəticələr canlı müqayisə olunur.
// Realtime: Supabase Postgres Changes (battles + battle_answers cədvəlləri).
import { supabase } from './supabase'
import quizzesData from '@/data/quizzes.json'
import type { Battle, BattleAnswer, QuizQuestion, TOLESLevel } from '@/types'

const ALL_QUESTIONS = quizzesData as QuizQuestion[]
const QUESTIONS_PER_BATTLE = 8

// TOLES səviyyəsi → quiz datasındakı qısa kod
const LEVEL_SHORTHAND: Record<TOLESLevel, string> = {
  Foundation: 'F',
  Higher: 'H',
  Advanced: 'A',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Verilmiş TOLES səviyyəsindən təsadüfi N sual seç (yoxdursa, bütün hovuzdan)
export function pickBattleQuestionIds(tolesLevel: TOLESLevel): number[] {
  const shorthand = LEVEL_SHORTHAND[tolesLevel] ?? 'F'
  let pool = ALL_QUESTIONS.filter((q) => q.level === shorthand)
  if (pool.length < QUESTIONS_PER_BATTLE) pool = ALL_QUESTIONS
  return shuffle(pool).slice(0, QUESTIONS_PER_BATTLE).map((q) => q.id)
}

export function getBattleQuestions(questionIds: number[]): QuizQuestion[] {
  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]))
  return questionIds.map((id) => byId.get(id)).filter(Boolean) as QuizQuestion[]
}

// ─── Yarış yaratmaq / dəvət ───────────────────────────
export async function createBattle(creatorId: string, opponentId: string, tolesLevel: TOLESLevel) {
  const questionIds = pickBattleQuestionIds(tolesLevel)
  const { data, error } = await supabase
    .from('battles')
    .insert({
      creator_id: creatorId,
      opponent_id: opponentId,
      status: 'pending',
      question_ids: questionIds,
      toles_level: tolesLevel,
    })
    .select()
    .single()
  return { data: data as Battle | null, error }
}

// Mənə gələn gözləyən dəvətlər
export async function getIncomingBattles(userId: string) {
  const { data, error } = await supabase
    .from('battles')
    .select('*, creator:creator_id(id, email, display_name, level, toles_level)')
    .eq('opponent_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Aktiv (davam edən) yarışlarım
export async function getActiveBattles(userId: string) {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('status', 'active')
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('started_at', { ascending: false })
  return { data: data as Battle[] | null, error }
}

export async function respondToBattle(battleId: string, accept: boolean) {
  const { data, error } = await supabase
    .from('battles')
    .update(
      accept
        ? { status: 'active', started_at: new Date().toISOString() }
        : { status: 'declined' }
    )
    .eq('id', battleId)
    .select()
    .single()
  return { data: data as Battle | null, error }
}

export async function getBattle(battleId: string) {
  const { data, error } = await supabase.from('battles').select('*').eq('id', battleId).single()
  return { data: data as Battle | null, error }
}

export async function completeBattle(battleId: string) {
  const { error } = await supabase
    .from('battles')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', battleId)
    .eq('status', 'active') // yalnız aktiv yarışı tamamla (iki tərəf eyni anda yazsa belə, bir dəfə)
  return { error }
}

// ─── Cavablar ─────────────────────────────────────────
export async function submitBattleAnswer(answer: {
  battle_id: string
  user_id: string
  q_index: number
  correct: boolean
  time_taken_ms: number
}) {
  const { error } = await supabase.from('battle_answers').insert(answer)
  return { error }
}

export async function getBattleAnswers(battleId: string) {
  const { data, error } = await supabase
    .from('battle_answers')
    .select('*')
    .eq('battle_id', battleId)
    .order('q_index', { ascending: true })
  return { data: data as BattleAnswer[] | null, error }
}

// ─── Realtime abunəlik ────────────────────────────────
// Yarış otağındaykən: rəqibin cavabları (battle_answers) və yarışın
// statusu (battles) dəyişəndə canlı bildiriş üçün.
export function subscribeToBattle(
  battleId: string,
  onAnswer: (row: BattleAnswer) => void,
  onBattleUpdate: (row: Battle) => void
) {
  const channel = supabase
    .channel(`battle:${battleId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'battle_answers', filter: `battle_id=eq.${battleId}` },
      (payload) => onAnswer(payload.new as BattleAnswer)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'battles', filter: `id=eq.${battleId}` },
      (payload) => onBattleUpdate(payload.new as Battle)
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// Dostlar siyahısında: gələn yarış dəvətlərini canlı izləmək üçün
export function subscribeToIncomingBattles(userId: string, onInsert: (row: Battle) => void) {
  const channel = supabase
    .channel(`incoming-battles:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'battles', filter: `opponent_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Battle)
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
