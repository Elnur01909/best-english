'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/dashboard',  icon: '🏠', label: 'Ana' },
  { href: '/vocabulary', icon: '🗂️', label: 'Lüğət' },
  { href: '/quiz',       icon: '✍️', label: 'Test' },
  { href: '/lessons',    icon: '📖', label: 'Dərslər' },
  { href: '/friends',    icon: '👥', label: 'Dostlar' },
]

// Bu səhifələrdə nav göstərilmir (auth, landing, canlı yarış və s.)
const HIDDEN_PREFIXES = [
  '/login', '/register', '/forgot-password', '/reset-password',
  '/onboarding', '/privacy', '/battles/',
]

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/' || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  return (
    <>
      {/* Fixed nav-ın altda qalan məzmunu örtməməsi üçün boşluq */}
      <div className="h-20 sm:hidden" aria-hidden />

      <nav
        className="bottom-nav fixed bottom-0 left-0 right-0 z-50 sm:hidden"
        style={{
          background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch justify-around px-1">
          {ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-2 px-2 flex-1 min-w-0 transition-transform active:scale-95"
              >
                <span
                  className="flex items-center justify-center w-11 h-7 rounded-full text-base transition-all"
                  style={active ? { background: 'var(--brand-subtle)', boxShadow: 'inset 0 0 0 1px var(--brand-light)' } : undefined}
                >
                  {item.icon}
                </span>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: active ? 'var(--brand)' : 'var(--text-3)' }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
