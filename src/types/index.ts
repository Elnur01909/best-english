// ─── İstifadəçi ───────────────────────────────────────
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type TOLESLevel = 'Foundation' | 'Higher' | 'Advanced'

export interface UserProfile {
  id: string
  email: string
  display_name?: string | null
  level: CEFRLevel
  toles_level: TOLESLevel
  streak: number
  total_points: number
  last_active: string
  created_at: string
}

// ─── Dostlar ──────────────────────────────────────────
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined'

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: FriendRequestStatus
  created_at: string
  responded_at: string | null
}

export interface FriendProfile {
  id: string
  email: string
  display_name?: string | null
  level: CEFRLevel
  toles_level: TOLESLevel
  streak: number
}

// ─── TOLES Mini-Test Yarışı ───────────────────────────
export type BattleStatus = 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'

export interface Battle {
  id: string
  creator_id: string
  opponent_id: string
  status: BattleStatus
  question_ids: number[]
  toles_level: TOLESLevel
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface BattleAnswer {
  id: string
  battle_id: string
  user_id: string
  q_index: number
  correct: boolean
  time_taken_ms: number
  answered_at: string
}

// ─── Lüğət ────────────────────────────────────────────
export type VocabTopic =
  | 'Contract Law'
  | 'Company Law'
  | 'Court & Litigation'
  | 'Employment Law'
  | 'Tort Law'
  | 'Property Law'
  | 'Legal Writing & Procedure'

export interface VocabItem {
  id: number
  term: string
  pos: string              // Noun, Verb, Adjective...
  en_def: string           // İngilis tərifi
  az_translation: string   // Azərbaycanca izah
  en_example: string       // Nümunə cümlə (EN)
  az_example: string       // Nümunə cümlə (AZ)
  collocations: string     // Kollokasiyalar
  level: CEFRLevel | 'F' | 'H' | 'A'   // TOLES level shorthand
  topic: VocabTopic
}

// ─── SRS İrəliləyiş ───────────────────────────────────
export interface VocabProgress {
  user_id: string
  vocab_id: number
  next_review: string      // ISO datetime
  interval: number         // günlərlə
  ease_factor: number      // default: 2.5
  repetitions: number
  consecutive_lapses?: number   // ardıcıl "Unuduram" sayı — 4+ olduqda "leech" sayılır
}

// ─── SRS Kartı ────────────────────────────────────────
export type SRSQuality = 0 | 1 | 2 | 3 | 4 | 5
// 0 = tamamilə unutdum
// 1 = yanlış, amma tanış
// 2 = yanlış, çətin
// 3 = düzgün, çox çətin
// 4 = düzgün, bir az çətin
// 5 = mükəmməl

export interface SRSResult {
  newInterval: number
  newEaseFactor: number
  newRepetitions: number
  nextReview: Date
}

// ─── Quiz ─────────────────────────────────────────────
export type QuizType = 'multiple_choice' | 'true_false' | 'fill_blank'
export type QuizLevel = 'Foundation' | 'Higher' | 'Advanced'

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correct: string
  explanation: string
  level: string
  topic: string
  type?: 'definition' | 'gap-fill' | 'collocation' | 'collocation-match' | 'preposition' | 'classification' | 'true-false' | 'sentence' | 'matching'  // sual formatı
}

export interface QuizResult {
  user_id: string
  quiz_id: number
  correct: boolean
  time_taken: number       // saniyə
  answered_at: string
}

// ─── Dərslər ──────────────────────────────────────────
export interface LessonVocabItem {
  term: string
  meaning: string
  az: string
}

export interface LessonExercise {
  question: string
  answer: string
}

export interface ImmersionLink {
  type: string
  title: string
  url: string
}

export interface Lesson {
  id: number
  title: string
  description: string
  content: string
  terms: number[]
  duration: number
  level: string
  objectives: string[]
  immersionLinks: ImmersionLink[]
}

export interface LessonProgress {
  user_id: string
  lesson_id: number
  completed: boolean
  completed_at: string | null
}

// ─── Statistika ───────────────────────────────────────
export interface WeeklyStats {
  date: string
  vocab_reviewed: number
  quiz_correct: number
  minutes_spent: number
}

export interface DashboardData {
  profile: UserProfile
  streak: number
  total_vocab_learned: number
  total_quiz_correct: number
  lessons_completed: number
  weekly_stats: WeeklyStats[]
  due_cards_count: number
}
