'use client'
import { useState, useEffect } from 'react'

interface AudioPlayerProps {
  word: string
  audioUrl?: string
  variant?: 'minimal' | 'card' | 'sentence'
  isSentence?: boolean   // cümlə üçün daha yavaş, daha natural
}

// Ən yaxşı İngilis səsini seç (Neural > Enhanced > standart)
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // Priority sırası — yuxarıdakılar daha natural
  const preferred = [
    'Microsoft Aria Online (Natural)',   // Windows 11 Neural
    'Microsoft Jenny Online (Natural)',
    'Microsoft Guy Online (Natural)',
    'Microsoft Aria',
    'Microsoft Jenny',
    'Microsoft Guy',
    'Microsoft Zira',                    // Windows 10
    'Microsoft David',
    'Google US English',                 // Chrome
    'Samantha',                          // macOS
  ]

  for (const name of preferred) {
    const v = voices.find((v) => v.name === name)
    if (v) return v
  }

  // Heç biri yoxdursa — istənilən en-US/en-GB
  return (
    voices.find((v) => v.lang === 'en-US' && v.localService === false) ?? // online (daha yaxşı)
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  )
}

function speak(text: string, isSentence: boolean, onStart: () => void, onEnd: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = isSentence ? 0.88 : 0.82  // cümlə bir az sürətli, söz daha yavaş
  utterance.pitch = 1.05                      // bir az daha natural

  // Səsləri yükləndikdən sonra seç (bəzi brauzerlərdə gecikmə var)
  const setVoiceAndSpeak = () => {
    const voice = getBestVoice()
    if (voice) utterance.voice = voice
    utterance.onstart = onStart
    utterance.onend = onEnd
    utterance.onerror = onEnd
    window.speechSynthesis.speak(utterance)
  }

  if (window.speechSynthesis.getVoices().length > 0) {
    setVoiceAndSpeak()
  } else {
    // Səslər hələ yüklənməyib — event-i gözlə
    window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true })
  }
}

export default function AudioPlayer({ word, audioUrl, variant = 'minimal', isSentence = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setSupported(false)
    }
  }, [])

  function playAudio() {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
      audio.play().catch(() => speak(word, isSentence, () => setIsPlaying(true), () => setIsPlaying(false)))
      return
    }
    speak(word, isSentence, () => setIsPlaying(true), () => setIsPlaying(false))
  }

  function stopAudio() {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
    }
  }

  if (!supported) return null

  // Cümlə variant — kiçik, göstərişsiz
  if (variant === 'sentence') {
    return (
      <button
        onClick={isPlaying ? stopAudio : playAudio}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 transition-colors text-xs font-medium"
        title="Cümləni dinlə"
      >
        {isPlaying ? '⏹' : '🔊'} {isPlaying ? 'Dayandır' : 'Cümləni dinlə'}
      </button>
    )
  }

  if (variant === 'card') {
    return (
      <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
        <button
          onClick={isPlaying ? stopAudio : playAudio}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors"
        >
          {isPlaying ? '⏹' : '🔊'}
        </button>
        <div>
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Tələffüzü dinlə</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">{word}</p>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={isPlaying ? stopAudio : playAudio}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors text-sm font-medium"
    >
      {isPlaying ? '⏹' : '🔊'} {isPlaying ? 'Dayandır' : 'Dinlə'}
    </button>
  )
}
