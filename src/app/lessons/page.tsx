'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, supabase } from '@/lib/supabase'
import lessonsData from '@/data/lessons.json'
import type { Lesson } from '@/types'

const LEVEL_BADGE: Record<string, string> = {
  A1: 'bg-green-100 text-green-700', A2: 'bg-emerald-100 text-emerald-700', B1: 'bg-teal-100 text-teal-700',
  F: 'bg-emerald-100 text-emerald-700', H: 'bg-blue-100 text-blue-700', A: 'bg-red-100 text-red-700',
  B2: 'bg-blue-100 text-blue-700', C1: 'bg-indigo-100 text-indigo-700', C2: 'bg-red-100 text-red-700',
}
const LEVEL_LABEL: Record<string, string> = {
  F: 'Foundation', H: 'Higher', A: 'Advanced',
  A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2',
}

export default function LessonsPage() {
  const router = useRouter()
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)

      if (data) setCompleted(new Set(data.map((d: { lesson_id: number }) => d.lesson_id)))
    }
    load()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-sm font-medium text-blue-600 hover:text-blue-800">🏠 Ana Səhifə</button>
        <h1 className="font-bold text-gray-900 dark:text-white">Dərslər</h1>
        <span className="text-sm text-gray-400 ml-auto">{completed.size} / {lessonsData.length} tamamlandı</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {(lessonsData as Lesson[]).map((lesson) => {
            const isDone = completed.has(lesson.id)
            return (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                className={`card block hover:shadow-md transition-shadow ${isDone ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl mt-0.5">📖</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">Dərs {lesson.id}</span>
                      <span className={`badge text-xs ${LEVEL_BADGE[lesson.level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {LEVEL_LABEL[lesson.level] ?? lesson.level}
                      </span>
                      {isDone && <span className="badge bg-green-100 text-green-700 text-xs">✓ Tamamlandı</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{lesson.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{lesson.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      ⏱ {lesson.duration} dəq · {lesson.terms?.length ?? 0} termin · {lesson.objectives?.length ?? 0} məqsəd
                    </p>
                  </div>
                  <span className="text-gray-300 dark:text-gray-700 text-xl">→</span>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
