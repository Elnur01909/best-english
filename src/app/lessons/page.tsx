'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, supabase } from '@/lib/supabase'
import lessonsData from '@/data/lessons.json'
import type { Lesson } from '@/types'

const LEVEL_BADGE: Record<string, string> = {
  A1: 'bg-green-100 text-green-700', A2: 'bg-emerald-100 text-emerald-700', B1: 'bg-teal-100 text-teal-700',
  F: 'bg-teal-100 text-teal-700', H: 'bg-blue-100 text-blue-700', A: 'bg-red-100 text-red-700',
  B2: 'bg-blue-100 text-blue-700', C1: 'bg-indigo-100 text-indigo-700', C2: 'bg-red-100 text-red-700',
}
const LEVEL_LABEL: Record<string, string> = {
  F: 'Foundation', H: 'Higher', A: 'Advanced',
  A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2',
}
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'F', 'H', 'A']
const LEVEL_SECTION: Record<string, { title: string; sub: string; color: string }> = {
  A1: { title: 'A1 — Başlanğıc',        sub: 'Gündəlik İngilis · Qrammatika',           color: 'border-green-400 bg-green-50 dark:bg-green-950' },
  A2: { title: 'A2 — Elementar',         sub: 'Keçmiş zaman · Müqayisə · Davam',        color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' },
  B1: { title: 'B1 — Orta',              sub: 'Present Perfect · Şərt cümlələri · Passiv', color: 'border-teal-400 bg-teal-50 dark:bg-teal-950' },
  F:  { title: 'Foundation — B1',        sub: 'TOLES · Hüquqi İngilis başlanğıc',       color: 'border-teal-500 bg-teal-50 dark:bg-teal-950' },
  H:  { title: 'Higher — B2',            sub: 'TOLES · Hüquqi İngilis orta',            color: 'border-blue-500 bg-blue-50 dark:bg-blue-950' },
  A:  { title: 'Advanced — C1',          sub: 'TOLES · Hüquqi İngilis irəli',           color: 'border-red-500 bg-red-50 dark:bg-red-950' },
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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {LEVEL_ORDER.map((lvl) => {
          const group = (lessonsData as Lesson[]).filter((l) => l.level === lvl)
          if (group.length === 0) return null
          const sec = LEVEL_SECTION[lvl]
          const doneInGroup = group.filter((l) => completed.has(l.id)).length
          return (
            <section key={lvl}>
              {/* Bölmə başlığı */}
              <div className={`border-l-4 pl-4 py-2 rounded-r-lg mb-3 ${sec.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">{sec.title}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sec.sub}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{doneInGroup}/{group.length}</span>
                </div>
              </div>

              <div className="space-y-3">
                {group.map((lesson, idx) => {
                  const isDone = completed.has(lesson.id)
                  return (
                    <Link
                      key={lesson.id}
                      href={`/lessons/${lesson.id}`}
                      className={`card block hover:shadow-md transition-shadow ${isDone ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            </section>
          )
        })}
      </main>
    </div>
  )
}
