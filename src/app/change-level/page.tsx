'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUser, getUserProfile, updateUserLevel } from '@/lib/supabase'
import { LEVEL_DESCRIPTIONS, cefrToToles } from '@/lib/utils'
import type { CEFRLevel } from '@/types'

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function ChangeLevelPage() {
  const router = useRouter()
  const [currentLevel, setCurrentLevel] = useState<CEFRLevel>('B1')
  const [newLevel, setNewLevel] = useState<CEFRLevel>('B1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadLevel() {
      const user = await getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await getUserProfile(user.id)
      if (profile?.level) {
        setCurrentLevel(profile.level as CEFRLevel)
        setNewLevel(profile.level as CEFRLevel)
      }
      setLoading(false)
    }

    loadLevel()
  }, [router])

  async function handleSave() {
    setSaving(true)
    setError('')

    const user = await getUser()
    if (!user) return

    const tolesLevel = cefrToToles(newLevel)
    const { error: updateError } = await updateUserLevel(user.id, newLevel, tolesLevel)

    if (updateError) {
      setError('Səviyyə saxlanarkən xəta baş verdi')
      setSaving(false)
      return
    }

    setCurrentLevel(newLevel)
    router.push('/dashboard')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yüklənir...</div>

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Səviyyəni Dəyiş</h1>
          <p className="text-gray-500 mt-1">Cari: <strong>{currentLevel}</strong></p>
        </div>

        <div className="card space-y-3">
          <p className="text-sm text-gray-500 mb-4">Yeni səviyyə seç:</p>

          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setNewLevel(l)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                newLevel === l
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">{l}</span>
                  <span className="text-sm text-gray-500 ml-2">{LEVEL_DESCRIPTIONS[l]}</span>
                </div>
                <span className="text-xs text-gray-400">TOLES: {cefrToToles(l)}</span>
              </div>
            </button>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="btn-secondary flex-1"
            >
              Ləğv Et
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || newLevel === currentLevel}
              className="btn-primary flex-1"
            >
              {saving ? 'Saxlanılır...' : 'Yadda Saxla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
