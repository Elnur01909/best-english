'use client'
import { useState } from 'react'

interface AudioPlayerProps {
  word: string
  audioUrl?: string
  variant?: 'minimal' | 'card'
}

export default function AudioPlayer({ word, audioUrl, variant = 'minimal' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

  // TTS fallback — Google Translate API istifadə et
  const getTTSUrl = () => {
    if (audioUrl) return audioUrl
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&client=tw-ob`
  }

  async function playAudio() {
    setLoading(true)
    try {
      const audio = new Audio(getTTSUrl())
      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
      await audio.play()
    } catch (err) {
      console.error('Audio play error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'card') {
    return (
      <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
        <button
          onClick={playAudio}
          disabled={loading}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {loading ? '⏳' : isPlaying ? '⏸' : '🔊'}
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
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors text-sm font-medium disabled:opacity-50"
    >
      {loading ? '⏳' : isPlaying ? '⏸' : '🔊'} {isPlaying ? 'Oynayan...' : 'Dinlə'}
    </button>
  )
}
