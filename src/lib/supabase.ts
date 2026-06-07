import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth köməkçiləri ─────────────────────────────────
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── İstifadəçi profili ───────────────────────────────
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function updateUserLevel(userId: string, level: string, tolesLevel: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ level, toles_level: tolesLevel })
    .eq('id', userId)
  return { data, error }
}

// ─── SRS — Lüğət irəliləyişi ─────────────────────────
export async function getDueCards(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('user_vocab_progress')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review', new Date().toISOString())
    .order('next_review', { ascending: true })
    .limit(limit)
  return { data, error }
}

export async function upsertVocabProgress(progress: {
  user_id: string
  vocab_id: number
  next_review: string
  interval: number
  ease_factor: number
  repetitions: number
  consecutive_lapses?: number
}) {
  const { data, error } = await supabase
    .from('user_vocab_progress')
    .upsert(progress, { onConflict: 'user_id,vocab_id' })
  return { data, error }
}

// ─── Quiz nəticəsi ────────────────────────────────────
export async function saveQuizResult(result: {
  user_id: string
  quiz_id: number
  correct: boolean
  time_taken: number
}) {
  const { data, error } = await supabase
    .from('user_quiz_results')
    .insert(result)
  return { data, error }
}

// ─── Statistika ───────────────────────────────────────
export async function getWeeklyStats(userId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('user_quiz_results')
    .select('correct, answered_at')
    .eq('user_id', userId)
    .gte('answered_at', sevenDaysAgo.toISOString())
  return { data, error }
}

export async function updateStreak(userId: string) {
  const { data: profile } = await getUserProfile(userId)
  if (!profile) return

  const today = new Date().toDateString()
  const lastActive = profile.last_active
    ? new Date(profile.last_active).toDateString()
    : null

  const isYesterday = lastActive === new Date(
    Date.now() - 86400000
  ).toDateString()

  const newStreak = lastActive === today
    ? profile.streak                   // artıq bu gün işlənib
    : isYesterday
      ? profile.streak + 1             // streak davam edir
      : 1                              // streak sıfırlandı

  await supabase
    .from('user_profiles')
    .update({ streak: newStreak, last_active: new Date().toISOString() })
    .eq('id', userId)

  return newStreak
}
