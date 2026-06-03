import type { SRSQuality, SRSResult } from '@/types'

/**
 * SM-2 Spaced Repetition Alqoritmi
 * Ebbinghaus unudulma əyrisinə əsaslanır
 *
 * quality:
 *   0 = tamamilə unutdum (düzgün cavab baxandan sonra da tanımır)
 *   1 = yanlış, amma xatırlayanda tanıdı
 *   2 = yanlış, amma cavabı görsə tanıyacaq
 *   3 = düzgün — çox çətin xatırladı
 *   4 = düzgün — bir az çətin
 *   5 = mükəmməl — dərhal xatırladı
 */
export function calculateNextReview(
  quality: SRSQuality,
  currentInterval: number,
  currentEaseFactor: number,
  currentRepetitions: number
): SRSResult {
  let newInterval: number
  let newEaseFactor: number
  let newRepetitions: number

  if (quality < 3) {
    // Yanlış cavab — sıfırdan başla
    newRepetitions = 0
    newInterval = 1
    newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2)
  } else {
    // Düzgün cavab
    newRepetitions = currentRepetitions + 1

    if (newRepetitions === 1) {
      newInterval = 1
    } else if (newRepetitions === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor)
    }

    // ease_factor yenilənməsi
    newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    newEaseFactor = Math.max(1.3, newEaseFactor) // minimum 1.3
  }

  // Maksimum interval: 365 gün
  newInterval = Math.min(365, newInterval)

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)

  return {
    newInterval,
    newEaseFactor,
    newRepetitions,
    nextReview,
  }
}

/**
 * Gün içindəki vaxtı formatla
 */
export function formatNextReview(date: Date): string {
  const now = new Date()
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays <= 0) return 'Bu gün'
  if (diffDays === 1) return 'Sabah'
  if (diffDays < 7) return `${diffDays} gün sonra`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} həftə sonra`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay sonra`
  return `${Math.floor(diffDays / 365)} il sonra`
}

/**
 * Yeni istifadəçi üçün başlanğıc dəyərlər
 */
export const SRS_DEFAULTS = {
  interval: 0,
  ease_factor: 2.5,
  repetitions: 0,
  next_review: new Date().toISOString(),
}

/**
 * Kartın "çətin"liyini rəng kimi qaytar
 */
export function getDifficultyColor(easeFactor: number): string {
  if (easeFactor >= 2.5) return 'text-green-600'
  if (easeFactor >= 2.0) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Kartın "çətin"liyini mətn kimi qaytar
 */
export function getDifficultyLabel(easeFactor: number): string {
  if (easeFactor >= 2.5) return 'Asan'
  if (easeFactor >= 2.0) return 'Orta'
  return 'Çətin'
}
