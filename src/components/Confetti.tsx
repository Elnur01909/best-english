'use client'
import { useState } from 'react'

// Yüngül CSS konfetti — kənar asılılıq yoxdur.
// Qiymətlər bir dəfə hesablanır ki, re-render-də səpələnmə dəyişməsin.
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#a855f7', '#f472b6', '#fbbf24']

type Piece = {
  left: number
  delay: number
  duration: number
  size: number
  color: string
  rotate: number
}

export default function Confetti({ count = 80 }: { count?: number }) {
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      duration: 2.4 + Math.random() * 1.8,
      size: 6 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
    }))
  )

  return (
    <div className="confetti-wrap" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            rotate: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
