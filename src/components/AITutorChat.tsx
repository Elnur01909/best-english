'use client'
import { useState, useRef, useEffect } from 'react'
import { tutorChat, hasApiKey, type AIMessage } from '@/lib/ai'
import AIKeySetup from './AIKeySetup'

interface AITutorChatProps {
  level?: string
}

export default function AITutorChat({ level = 'B1' }: AITutorChatProps) {
  const [open, setOpen] = useState(false)
  const [keyReady, setKeyReady] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setKeyReady(hasApiKey())
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    const newHistory: AIMessage[] = [...messages, { role: 'user', text }]
    setMessages(newHistory)
    setLoading(true)
    try {
      const reply = await tutorChat(newHistory, level)
      setMessages([...newHistory, { role: 'model', text: reply }])
    } catch (err: any) {
      if (err.message === 'BAD_KEY') {
        setError('Açar yanlışdır. Yenidən daxil et.')
        setKeyReady(false)
      } else if (err.message === 'RATE_LIMIT') {
        setError('Günlük pulsuz limit doldu. Sabah yenidən cəhd et.')
      } else {
        setError('Xəta baş verdi. Yenidən cəhd et.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Üzən düymə */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-105"
          aria-label="AI Müəllim"
        >
          🎓
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-600 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span className="font-semibold text-sm">AI Müəllim</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-xl leading-none">×</button>
          </div>

          {!keyReady ? (
            <div className="flex-1 overflow-y-auto">
              <AIKeySetup onSaved={() => setKeyReady(true)} />
            </div>
          ) : (
            <>
              {/* Mesajlar */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm mt-8 px-4">
                    <p className="mb-2">👋 Salam! Mən sənin İngilis/TOLES müəllimənəm.</p>
                    <p className="text-xs">Sual ver: "liable nə deməkdir?", "bu cümlə düzgündürmü?", "consideration izah et"...</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] p-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'ml-auto bg-blue-600 text-white'
                        : 'mr-auto bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {loading && (
                  <div className="mr-auto bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl text-sm text-gray-500">
                    yazır...
                  </div>
                )}
                {error && (
                  <div className="text-center text-red-500 text-xs">{error}</div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Sualını yaz..."
                  disabled={loading}
                  className="input text-sm flex-1"
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
