'use client'
import { useState, useEffect } from 'react'

interface AudioPlayerProps {
  word: string
  audioUrl?: string
  variant?: 'minimal' | 'card'
}

export default function AudioPlayer({ word, audioUrl, variant = 'minimal' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    // Brauzer Web Speech API dəstəkləyir mi?
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setSupported(false)
    }
  }, [])

  function playAudio() {
    // 1) Əgər real audio faylı varsa — onu çal
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
      audio.play().catch((err) => {
        console.error('Audio play error:', err)
        speak() // fallback
      })
      return
    }
    speak()
  }

  // Brauzerin daxili TTS-i (Web Speech API) — CORS yoxdur, offline işləyir
  function speak() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false)
      return
    }

    // Əvvəlki səsi dayandır
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.85 // bir az yavaş — öyrənmə üçün daha aydın
    utterance.pitch = 1

    // İngilis səsini seç (varsa)
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find((v) => v.lang.startsWith('en'))
    if (enVoice) utterance.voice = enVoice

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    window.speechSynthesis.speak(utterance)
  }

  if (!supported) return null

  if (variant === 'card') {
    return (
      <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
        <button
          onClick={playAudio}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors"
        >
          {isPlaying ? '⏸' : '🔊'}
        </button>
        <div>
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Native Tələffüzü</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">{word}</p>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={playAudio}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors text-sm font-medium"
    >
      {isPlaying ? '⏸' : '🔊'} {isPlaying ? 'Oynayan...' : 'Dinlə'}
    </button>
  )
}
