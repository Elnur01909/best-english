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

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  return { error }
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
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

// İstifadəçinin artıq başladığı (gördüyü) bütün söz id-ləri — təkrar daxiletməni önləmək üçün
export async function getSeenVocabIds(userId: string): Promise<Set<number>> {
  const { data } = await supabase
    .from('user_vocab_progress')
    .select('vocab_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map((r: { vocab_id: number }) => r.vocab_id))
}

// Bütün söz irəliləyişi (nərdivan/mənimsəmə hesablamaq üçün)
export async function getAllVocabProgress(userId: string): Promise<Array<{ vocab_id: number; repetitions: number; interval: number }>> {
  const { data } = await supabase
    .from('user_vocab_progress')
    .select('vocab_id, repetitions, interval')
    .eq('user_id', userId)
  return (data ?? []) as Array<{ vocab_id: number; repetitions: number; interval: number }>
}

// ─── Mnemonika keşi (paylaşılan — hər söz üçün bir dəfə AI ilə generasiya) ──
export async function getMnemonic(vocabId: number) {
  const { data, error } = await supabase
    .from('vocab_mnemonics')
    .select('mnemonic_az')
    .eq('vocab_id', vocabId)
    .maybeSingle()
  return { data, error }
}

export async function saveMnemonic(vocabId: number, mnemonicAz: string) {
  const { data, error } = await supabase
    .from('vocab_mnemonics')
    .upsert({ vocab_id: vocabId, mnemonic_az: mnemonicAz }, { onConflict: 'vocab_id' })
  return { data, error }
}

// ─── Dərin Kodlaşdırma keşi (Yaddaş Laboratoriyası — paylaşılan) ─────
// Mnemonika + etimologiya bir AI çağırışında generasiya
// olunur və hər söz üçün YALNIZ BİR DƏFƏ keşlənir (bütün istifadəçilər paylaşır).
export async function getDeepDive(vocabId: number) {
  const { data, error } = await supabase
    .from('vocab_deep_dive')
    .select('mnemonic_az, etymology_az')
    .eq('vocab_id', vocabId)
    .maybeSingle()
  return { data, error }
}

export async function saveDeepDive(
  vocabId: number,
  d: { mnemonic: string; etymology: string }
) {
  const { data, error } = await supabase
    .from('vocab_deep_dive')
    .upsert(
      { vocab_id: vocabId, mnemonic_az: d.mnemonic, etymology_az: d.etymology },
      { onConflict: 'vocab_id' }
    )
  return { data, error }
}

// ─── Yaddaş Laboratoriyası — "leech" sözlərin oxunması (read-only) ───
// Günlük plana TƏSİR ETMİR — sadəcə istifadəçinin ən çox unutduğu sözləri
// tapıb, "Yaddaş Laboratoriyası" sessiyasına önəri kimi gətirir.
export async function getLeechWords(userId: string, limit = 5) {
  const { data, error } = await supabase
    .from('user_vocab_progress')
    .select('*')
    .eq('user_id', userId)
    .gte('consecutive_lapses', 2)
    .order('consecutive_lapses', { ascending: false })
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
