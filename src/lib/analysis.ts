// Deliberate Practice — Zəif nöqtə analizi

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
