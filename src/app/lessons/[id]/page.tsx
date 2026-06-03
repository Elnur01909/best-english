'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getUser, supabase } from '@/lib/supabase'
import AudioPlayer from '@/components/AudioPlayer'
import WritingExercise from '@/components/WritingExercise'
import lessonsData from '@/data/lessons.json'
import vocabData from '@/data/vocab.json'
import type { Lesson, VocabItem } from '@/types'

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const lesson = (lessonsData as Lesson[]).find((l) => l.id === id)

  const [userId, setUserId] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([])

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('user_lesson_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('lesson_id', id)
        .single()

      if (data?.completed) setCompleted(true)

      if (lesson?.terms) {
        const items = (vocabData as VocabItem[]).filter((v) => lesson.terms.includes(v.id))
        setVocabItems(items)
      }
    }
    load()
  }, [router, id, lesson])

  async function markComplete() {
    if (!userId || completed) return
    await supabase.from('user_lesson_progress').upsert({
      user_id: userId,
      lesson_id: id,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })
    setCompleted(true)
  }

  if (!lesson) return <div className="p-8 text-center text-gray-500">Dərs tapılmadı</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/lessons')} className="text-gray-500">← Geri</button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Dərs {lesson.id} · {lesson.level}</p>
            <h1 className="font-bold text-gray-900 dark:text-white truncate">{lesson.title}</h1>
          </div>
          {completed && <span className="badge bg-green-100 text-green-700 shrink-0">✓ Tamamlandı</span>}
        </div>
      </header>


      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hədəflər */}
        <div className="card bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">🎯 Öyrənmə Hədəfləri</h3>
          <ul className="space-y-2">
            {lesson?.objectives?.map((o, i) => (
              <li key={i} className="text-sm text-blue-800 dark:text-blue-200">✓ {o}</li>
            ))}
          </ul>
        </div>

        {/* Lüğət */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">📚 Dərsin Lüğəti</h2>
          <div className="space-y-4">
            {vocabItems.map((v) => (
              <div key={v.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-bold text-gray-900 dark:text-white">{v.term}</div>
                  <AudioPlayer word={v.term} variant="minimal" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{v.en_def}</div>
                <div className="text-sm text-green-700 dark:text-green-400 mt-1 italic">{v.az_translation}</div>
                <div className="text-xs text-gray-400 mt-2">🔗 {v.collocations}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Yazma Məşqi — 4-Modal: Motor */}
        {vocabItems.length > 0 && (
          <WritingExercise
            word={vocabItems[Math.floor(Math.random() * vocabItems.length)].term}
            definition={vocabItems[Math.floor(Math.random() * vocabItems.length)].en_def}
            optional={true}
          />
        )}

        {/* Immersion Körpüsü — Mass Immersion Approach */}
        {lesson?.immersionLinks && lesson.immersionLinks.length > 0 && (
          <div className="card border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-4">
              🌍 İmmersion Körpüsü — Bu Həftə Əlavə Oxu
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
              Real dünya kontentinə maruz qalma beyni daha sürətli gücləndirir.
            </p>
            <div className="space-y-2">
              {lesson.immersionLinks.map((link: any, idx: number) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white dark:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {link.type === 'youtube' && '▶️'}
                      {link.type === 'podcast' && '🎙️'}
                      {link.type === 'article' && '📰'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-purple-900 dark:text-purple-100 text-sm">
                        {link.title}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {link.type === 'youtube' && 'YouTube - 10-15 dəq'}
                        {link.type === 'podcast' && 'Podcast - 20-30 dəq'}
                        {link.type === 'article' && 'Məqalə - 5-10 dəq'}
                      </p>
                    </div>
                    <span className="text-purple-400">→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tamamlama düyməsi */}
        {!completed && (
          <button onClick={markComplete} className="btn-primary w-full">
            ✓ Dərsi Tamamladım
          </button>
        )}
        {completed && (
          <div className="text-center py-4 text-green-600 font-medium">
            🎉 Bu dərsi tamamladın!
          </div>
        )}
      </main>
    </div>
  )
}
