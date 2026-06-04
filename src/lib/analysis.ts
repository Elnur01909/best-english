// Deliberate Practice — Zəif nöqtə analizi
import { supabase } from './supabase'
import quizzesData from '@/data/quizzes.json'

export interface WeakPoint {
  topic: string
  errorRate: number       // 0-100%
  wrong: number
  total: number
  recommendation: string
}

// Supabase-dən son 50 quiz nəticəsini oxuyub zəif mövzuları tap
export async function getWeakPointsFromHistory(userId: string): Promise<WeakPoint[]> {
  const { data, error } = await supabase
    .from('user_quiz_results')
    .select('quiz_id, correct')
    .eq('user_id', userId)
    .order('answered_at', { ascending: false })
    .limit(100)

  if (error || !data || data.length === 0) return []

  // quiz_id-yə görə mövzu tap
  const quizMap: Record<number, string> = {}
  ;(quizzesData as any[]).forEach(q => { quizMap[q.id] = q.topic })

  // Mövzu üzrə statistika
  const stats: Record<string, { correct: number; total: number }> = {}
  data.forEach(r => {
    const topic = quizMap[r.quiz_id] || 'Digər'
    if (!stats[topic]) stats[topic] = { correct: 0, total: 0 }
    stats[topic].total++
    if (r.correct) stats[topic].correct++
  })

  // Zəif nöqtələr: ən az 3 sual olsun, >30% xəta
  return Object.entries(stats)
    .filter(([, s]) => s.total >= 3)
    .map(([topic, s]) => {
      const errorRate = Math.round(((s.total - s.correct) / s.total) * 100)
      return {
        topic,
        errorRate,
        wrong: s.total - s.correct,
        total: s.total,
        recommendation: errorRate > 60
          ? 'Çox zəif — dərhal drill et!'
          : errorRate > 40
          ? 'Orta — bu həftə fokuslan'
          : 'Kiçik boşluq — bir neçə məşq kifayət',
      }
    })
    .filter(wp => wp.errorRate > 30)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5) // Top 5 zəif mövzu
}


interface QuizQuestion {
  id: number
  topic: string
  correct: string
}

interface QuizResult {
  correct: boolean
  topic: string
}

export function analyzeWeakPoints(
  quizzes: QuizQuestion[],
  results: boolean[]
): { topic: string; errorRate: number; recommendation: string }[] {
  // Topic-ə görə xətaları qrup et
  const topicStats: Record<string, { correct: number; total: number }> = {}

  quizzes.forEach((quiz, idx) => {
    if (!topicStats[quiz.topic]) {
      topicStats[quiz.topic] = { correct: 0, total: 0 }
    }
    topicStats[quiz.topic].total++
    if (results[idx]) {
      topicStats[quiz.topic].correct++
    }
  })

  // Zəif nöqtələri sırala (ən zəif = ən yüksək error rate)
  const weakPoints = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      errorRate: Math.round(((stats.total - stats.correct) / stats.total) * 100),
      recommendation: getRecommendation(topic, stats),
    }))
    .filter((wp) => wp.errorRate > 25) // 25%-dən çox xəta
    .sort((a, b) => b.errorRate - a.errorRate)

  return weakPoints
}

function getRecommendation(
  topic: string,
  stats: { correct: number; total: number }
): string {
  const errorRate = ((stats.total - stats.correct) / stats.total) * 100

  if (errorRate > 70) {
    return `${topic} sahəsində çox çalışmağa ehtiyac var. Bu həftə 15+ məşq yap.`
  } else if (errorRate > 50) {
    return `${topic}-da möhkəmlənmə lazımdır. Hər gün 10 min quiz həll et.`
  } else if (errorRate > 25) {
    return `${topic}-da kiçik düzəlişlər lazımdır. Bu həftə 5-7 test yap.`
  }
  return ''
}

// Dopamin — Milestones
export function getNextMilestone(totalQuizzesCompleted: number): {
  milestone: number
  message: string
} | null {
  const milestones = [
    { milestone: 10, message: '🎯 10 Quiz Tamamlandı!' },
    { milestone: 25, message: '⚡ 25 Quiz — Güclü Başlanğıc!' },
    { milestone: 50, message: '🔥 50 Quiz — Əhəmiyyətli Piroqres!' },
    { milestone: 100, message: '👑 100 Quiz — Quiz Master!' },
  ]

  const next = milestones.find((m) => m.milestone === totalQuizzesCompleted)
  return next || null
}
