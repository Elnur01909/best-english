import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CEFRLevel, TOLESLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Level rəngləri ───────────────────────────────────
export const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: 'bg-gray-100 text-gray-700 border-gray-300',
  A2: 'bg-blue-100 text-blue-700 border-blue-300',
  B1: 'bg-green-100 text-green-700 border-green-300',
  B2: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  C1: 'bg-orange-100 text-orange-700 border-orange-300',
  C2: 'bg-purple-100 text-purple-700 border-purple-300',
}

export const TOLES_COLORS: Record<TOLESLevel, string> = {
  Foundation: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Higher:     'bg-blue-100 text-blue-700 border-blue-300',
  Advanced:   'bg-red-100 text-red-700 border-red-300',
}

// ─── Level açıqlamaları ───────────────────────────────
export const LEVEL_DESCRIPTIONS: Record<CEFRLevel, string> = {
  A1: 'Elementar — Gündəlik ifadələr',
  A2: 'Başlanğıc — Sadə kommunikasiya',
  B1: 'Orta — Adi mövzularda danışıq',
  B2: 'Yüksək Orta — Mürəkkəb mətnlər',
  C1: 'Qabaqcıl — Peşəkar səviyyə',
  C2: 'Mükəmməl — Native-yaxın',
}

export const TOLES_DESCRIPTIONS: Record<TOLESLevel, string> = {
  Foundation: 'A2–B1 | Əsas hüquqi lüğət',
  Higher:     'B2–C1 | Mürəkkəb sənədlər + Dinləmə',
  Advanced:   'C1–C2 | Kommersiya hüququ | Qızıl standart',
}

// ─── Rəqəm formatı ────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

// ─── Tarix formatı ────────────────────────────────────
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('az-AZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Quiz düzgünlük faizi ─────────────────────────────
export function getAccuracyColor(pct: number): string {
  if (pct >= 80) return 'text-green-600'
  if (pct >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

// ─── CEFR → TOLES map ────────────────────────────────
export function cefrToToles(level: CEFRLevel): TOLESLevel {
  if (level === 'A1' || level === 'A2' || level === 'B1') return 'Foundation'
  if (level === 'B2' || level === 'C1') return 'Higher'
  return 'Advanced'
}
