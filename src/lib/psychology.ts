// Affective Filter — Xəta feedback mesajları

export const GROWTH_MINDSET_MESSAGES = {
  wrong_answer: [
    '🧠 Beyin güclənir! Bu xəta zəka artırır.',
    '✨ Maraqlı cəhd! Hələ öyrənmə prosesindəsiniz.',
    '💪 Bu çətin cəhd — mən irəliləyirəm deməkdir.',
    '🔄 Hələ əvvəldir. Bu söz qısa müddətdə gələn həftə daha asanda olacaq.',
  ],
  vocabulary_hard: [
    '📚 Çətin sözlər = beynin böyümə əlaməti',
    '🌱 Native speakers də bu sözləri bilmir. Sən doğru yoldasan.',
    '⚡ Hər xəta neural bağlantılarını möhkəmləndirir.',
  ],
  streak_break: [
    '🔄 Streatin sona çatdı, amma bu öyrənməni dayandırmadı. Başla yenidən.',
    '🎯 Kiçik aralar — beynə yaxşı. Mütəmadi möhkündür.',
    '💫 Mən istifadə edirsən — bu tərəqqi deməkdir.',
  ],
  success: [
    '🎉 Doğru! Beyin bu bilgiyi saxlayır.',
    '⭐ Təbriklərim! Səsiniz güclənir.',
    '🚀 Native səviyyəsinə bir addım yaxın!',
    '💎 Bu söz ləhçəniz hissəsinə keçdi.',
  ],
}

export function getRandomMessage(category: keyof typeof GROWTH_MINDSET_MESSAGES): string {
  const messages = GROWTH_MINDSET_MESSAGES[category]
  return messages[Math.floor(Math.random() * messages.length)]
}

// Affective Filter — Məlumatlandırma mesajları
export const AFFECTIVE_FILTER_MESSAGES = {
  no_pressure: "Bu tətbiqdə sənə heç kəs mühakimə etməyəcək. Xəta = məlumat.",
  safe_space: "Xətasız öyrənmə təsəvvür edin. Burada bu realdir.",
  mindset_shift: "Düşüncə dəyişdirdikdən sonra hər şey dəyişir.",
}

// Streak Psychology — Dopamin mesajları
export const DOPAMINE_MESSAGES = {
  milestone_7: '🔥 7 günlük ardıcıl! Bir ədat başlandı.',
  milestone_30: '⚡ 30 günlük ardıcıl! Sən bu işə ciddi.',
  milestone_100: '👑 100 günlük ardıcıl! Sən artıq bir polyglot!',
  daily_win: '✓ Bugünün öyrənmə tamamlandı. Dopamin buraxıldı. 🧬',
}

export function getStreakMilestoneMessage(days: number): string | null {
  if (days === 7) return DOPAMINE_MESSAGES.milestone_7
  if (days === 30) return DOPAMINE_MESSAGES.milestone_30
  if (days === 100) return DOPAMINE_MESSAGES.milestone_100
  return null
}
