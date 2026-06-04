'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/supabase'
import { getWeakPointsFromHistory, type WeakPoint } from '@/lib/analysis'

export default function WeakPoints() {
  const router = useRouter()
  const [points, setPoints] = useState<WeakPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser().then(async u => {
      if (!u) return
      const wp = await getWeakPointsFromHistory(u.id)
      setPoints(wp)
      setLoading(false)
    })
  }, [])

  if (loading) return null
  if (points.length === 0) return (
    <div className="card mb-8 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
      <p className="text-sm text-green-700 dark:text-green-300 text-center">
        ✅ Zəif nöqtə aşkarlanmadı — əla gedirsən!
      </p>
    </div>
  )

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">🎯 Zəif Nöqtə Drilleri</h3>
        <span className="text-xs text-gray-400">Quiz tarixçəsindən</span>
      </div>

      <div className="space-y-3">
        {points.map(wp => (
          <div key={wp.topic} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-medium text-gray-900 dark:text-white text-sm">{wp.topic}</span>
                <p className="text-xs text-gray-500 mt-0.5">{wp.recommendation}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${
                  wp.errorRate > 60 ? 'text-red-600' :
                  wp.errorRate > 40 ? 'text-orange-500' : 'text-yellow-600'
                }`}>
                  {wp.errorRate}% xəta
                </span>
                <button
                  onClick={() => router.push(`/drill?topic=${encodeURIComponent(wp.topic)}`)}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Drill et →
                </button>
              </div>
            </div>
            {/* Progress bar — xəta faizi */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  wp.errorRate > 60 ? 'bg-red-500' :
                  wp.errorRate > 40 ? 'bg-orange-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${wp.errorRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{wp.wrong}/{wp.total} sualda xəta</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        💡 Xəta faizi >30% olan mövzular avtomatik göstərilir
      </p>
    </div>
  )
}
