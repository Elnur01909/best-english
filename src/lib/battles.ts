// ─── Mini-Test Yarışı (real-vaxt) ─────────────────────
// İki dost eyni sual dəstini paralel həll edir, nəticələr canlı müqayisə olunur.
// Realtime: Supabase Postgres Changes (battles + battle_answers cədvəlləri).
import { supabase } from './supabase'
import quizzesData from '@/data/quizzes.json'
import type { Battle, BattleAnswer, BattleLevel, QuizQuestion } from '@/types'

const ALL_QUESTIONS = quizzesData as QuizQuestion[]
const QUESTIONS_PER_BATTLE = 8

// CEFR səviyyələri (ümumi ingilis treki)
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// TOLES shorthand → tam ad (görüntü üçün)
export const BATTLE_LEVEL_LABEL: Record<string, string> = {
  A1: 'A1 · Ümumi', A2: 'A2 · Ümumi', B1: 'B1 · Ümumi',
  B2: 'B2 · Ümumi', C1: 'C1 · Ümumi', C2: 'C2 · Ümumi',
  F: 'Foundation · TOLES', H: 'Higher · TOLES', A: 'Advanced · TOLES',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Verilmiş səviyyədən təsadüfi N sual seç — həm CEFR, həm TOLES dəstəklənir
export function pickBattleQuestionIds(battleLevel: BattleLevel): number[] {
  let pool: QuizQuestion[]
  if (CEFR_LEVELS.includes(battleLevel)) {
    // Ümumi ingilis — CEFR səviyyəsinə görə filtrə et
    pool = ALL_QUESTIONS.filter(
      (q) => q.cefr === battleLevel && (q.track ?? 'legal') === 'general'
    )
  } else {
    // TOLES — level shorthand (F / H / A)
    pool = ALL_QUESTIONS.filter((q) => q.level === battleLevel)
  }
  if (pool.length < QUESTIONS_PER_BATTLE) pool = ALL_QUESTIONS
  return shuffle(pool).slice(0, QUESTIONS_PER_BATTLE).map((q) => q.id)
}

export function getBattleQuestions(questionIds: number[]): QuizQuestion[] {
  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]))
  return questionIds.map((id) => byId.get(id)).filter(Boolean) as QuizQuestion[]
}

// ─── Yarış yaratmaq / dəvət ───────────────────────────
export async function createBattle(creatorId: string, opponentId: string, battleLevel: BattleLevel) {
  const questionIds = pickBattleQuestionIds(battleLevel)
  const { data, error } = await supabase
    .from('battles')
    .insert({
      creator_id: creatorId,
      opponent_id: opponentId,
      status: 'pending',
      question_ids: questionIds,
      toles_level: battleLevel,   // DB sütunu adı qalır
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

// Gələn yarış dəvətlərini canlı izləmək üçün (həm /friends səhifəsi, həm də
// qlobal BattleChallengePopup eyni anda abunə ola bilər — Supabase eyni adlı
// kanala 2-ci dəfə abunə olmağa icazə vermədiyi üçün, hər çağırışda unikal
// kanal adı yaradılır ki, "...after subscribe()" xətası baş verməsin).
export function subscribeToIncomingBattles(userId: string, onInsert: (row: Battle) => void) {
  const uniqueId = Math.random().toString(36).slice(2, 10)
  const channel = supabase
    .channel(`incoming-battles:${userId}:${uniqueId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'battles', filter: `opponent_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Battle)
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
