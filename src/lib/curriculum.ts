import { supabase } from './supabase'
import curriculumData from '@/data/curriculum.json'

export interface CurriculumDay {
  day: number
  title: string
  title_en: string
  toles_level: string
  topics: string[]
  reading_id: number
  focus: string
  vocab_count: number
  vocab_ids: number[]   // Həmin mətndəki 8 əsas termin
  is_review?: boolean
  is_exam?: boolean
}

export const CURRICULUM: CurriculumDay[] = curriculumData as CurriculumDay[]

export interface DailyPlan {
  day: number
  curriculum: CurriculumDay
  completedSessions: string[]
  carryOver: string[]   // keçmiş günün tamamlanmamış sessionları
  isNewDay: boolean
}

// User-in müfredat irəliləyişini oxu
export async function getUserCurriculumProgress(userId: string) {
  const { data } = await supabase
    .from('user_curriculum_progress')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

// Günlük planı hesabla
export async function getDailyPlan(userId: string): Promise<DailyPlan> {
  const today = new Date().toISOString().slice(0, 10)
  let progress = await getUserCurriculumProgress(userId)

  // İlk dəfə — Day 1 ilə başla
  if (!progress) {
    await supabase.from('user_curriculum_progress').upsert({
      user_id: userId,
      current_day: 1,
      completed_sessions: [],
      last_plan_date: today,
    })
    return {
      day: 1,
      curriculum: CURRICULUM[0],
      completedSessions: [],
      carryOver: [],
      isNewDay: true,
    }
  }

  const isNewDay = progress.last_plan_date !== today

  if (isNewDay) {
    // Yeni gün: keçmiş günün tamamlanmamış sessionlarını tap
    const allSessions = ['morning', 'midday', 'evening', 'night']
    const completed: string[] = progress.completed_sessions || []
    const carryOver = allSessions.filter(s => !completed.includes(s))

    // Yeni günə keç (əgər bütün sessionlar tamamlandısa)
    const allDone = allSessions.every(s => completed.includes(s))
    const nextDay = allDone
      ? Math.min(progress.current_day + 1, CURRICULUM.length)
      : progress.current_day

    // Progress sıfırla
    await supabase.from('user_curriculum_progress').upsert({
      user_id: userId,
      current_day: nextDay,
      completed_sessions: [],
      last_plan_date: today,
      updated_at: new Date().toISOString(),
    })

    return {
      day: nextDay,
      curriculum: CURRICULUM[nextDay - 1],
      completedSessions: [],
      carryOver,
      isNewDay: true,
    }
  }

  return {
    day: progress.current_day,
    curriculum: CURRICULUM[progress.current_day - 1],
    completedSessions: progress.completed_sessions || [],
    carryOver: [],
    isNewDay: false,
  }
}

// Session tamamlandı kimi işarələ
export async function completeSession(userId: string, sessionId: string) {
  const progress = await getUserCurriculumProgress(userId)
  if (!progress) return

  const completed: string[] = progress.completed_sessions || []
  if (!completed.includes(sessionId)) {
    completed.push(sessionId)
    await supabase.from('user_curriculum_progress').upsert({
      user_id: userId,
      current_day: progress.current_day,
      completed_sessions: completed,
      last_plan_date: progress.last_plan_date,
      updated_at: new Date().toISOString(),
    })
  }
}
