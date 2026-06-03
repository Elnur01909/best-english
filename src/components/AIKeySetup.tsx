'use client'
import { useState } from 'react'
import { setApiKey } from '@/lib/ai'

interface AIKeySetupProps {
  onSaved: () => void
}

export default function AIKeySetup({ onSaved }: AIKeySetupProps) {
  const [key, setKey] = useState('')

  function save() {
    if (!key.trim()) return
    setApiKey(key)
    onSaved()
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-center">
        <div className="text-3xl mb-2">🎓</div>
        <h3 className="font-semibold text-gray-900 dark:text-white">AI Müəllimi Aktivləşdir</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Pulsuz Google Gemini açarı ilə (kart lazım deyil)
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1">
        <p className="font-semibold">Açarı necə alıram? (30 saniyə)</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              aistudio.google.com/apikey
            </a>{' '}
            aç
          </li>
          <li>Google hesabınla daxil ol</li>
          <li>"Create API key" → açarı kopyala</li>
          <li>Aşağıya yapışdır ✓</li>
        </ol>
      </div>

      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="AIza... açarını yapışdır"
        className="input text-sm"
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />

      <button onClick={save} disabled={!key.trim()} className="btn-primary w-full text-sm">
        Yadda saxla və başla →
      </button>

      <p className="text-[11px] text-gray-400 text-center">
        🔒 Açar yalnız bu cihazda saxlanır, serverə göndərilmir.
      </p>
    </div>
  )
}
