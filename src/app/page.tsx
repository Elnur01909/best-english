import Link from 'next/link'

const STATS = [
  { value: '~1600', label: 'Test sualı' },
  { value: '378',   label: 'Hüquqi termin' },
  { value: '27',    label: 'Mini-dərs' },
  { value: '14',    label: 'Case Study' },
]

const FEATURES = [
  {
    icon: '🗂️', bg: '#e0e7ff', accent: '#6366f1',
    title: 'Elmi SRS Lüğəti',
    desc: 'SM-2 alqoritmi sözü tam unutmaq üzrə olduğun anda qarşına çıxarır — Ebbinghaus unudulma əyrisinə əsasən.',
  },
  {
    icon: '✍️', bg: '#fef3c7', accent: '#f59e0b',
    title: '9 Formatlı Testlər',
    desc: 'Tərif, boşluq, kollokasiya, sözönü, təsnifat və daha çox — Foundation-dan Advanced-a qədər.',
  },
  {
    icon: '📖', bg: '#d1fae5', accent: '#10b981',
    title: 'İnteraktiv Dərslər',
    desc: 'Müqavilə, məhkəmə, əmək hüququ — hər dərsdə qrammatika, oxuma və yazma məşqi.',
  },
  {
    icon: '⚔️', bg: '#fee2e2', accent: '#ef4444', live: true,
    title: 'Canlı Yarış',
    desc: 'Dostunu email ilə tap, istənilən səviyyədə canlı mini-test yarışında 30 saniyəlik raundlarda üz-üzə gəl.',
  },
  {
    icon: '🤖', bg: '#e0f2fe', accent: '#0ea5e9',
    title: 'AI Müəllim',
    desc: 'Yazını yoxlayır, səhvini izah edir, suallarını cavablayır.',
  },
  {
    icon: '🧪', bg: '#fce7f3', accent: '#ec4899',
    title: 'Yaddaş Laboratoriyası',
    desc: '9 elmi yaddaş üsulunu bir sözün üzərində birləşdir — dərin, unudulmaz öyrənmə.',
  },
]

const TOLES_PATH = [
  { step: '01', label: 'Foundation', cefr: 'B1–B2', color: '#10b981', desc: 'Hüquqi ingiliscənin təməli: əsas terminlər, sadə müqavilə dili' },
  { step: '02', label: 'Higher',     cefr: 'C1',    color: '#6366f1', desc: 'Peşəkar səviyyə: mürəkkəb sənədlər, kollokasiyalar, dəqiq ifadə' },
  { step: '03', label: 'Advanced',   cefr: 'C2',    color: '#f59e0b', desc: 'Usta səviyyə: beynəlxalq hüquq firmalarının gözlədiyi dil səviyyəsi' },
]

const STEPS = [
  { icon: '🎯', title: 'Səviyyəni seç', desc: 'A1-dən C2-yə — 18 suallıq yerləşdirmə testi ilə dəqiq səviyyəni 3 dəqiqəyə öyrən.' },
  { icon: '📅', title: 'Gündə 45 dəqiqə', desc: 'Səhər/gündüz/axşam mini-sessiyalar. Konsistensiya intensivlikdən güclüdür.' },
  { icon: '📈', title: 'İrəliləyişi izlə', desc: 'Streak, statistika, zəif nöqtə analizi — hər addımın görünür və ölçülür.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 2px 10px rgba(99,102,241,0.4)' }}>
              BE
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Best English</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Daxil Ol</Link>
            <Link href="/register" className="btn-primary !py-2 !px-4 text-sm">Başla</Link>
          </div>
        </div>
      </header>

      {/* ── Hero (tünd, immersiv) ──────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-16 sm:pt-24 sm:pb-20"
               style={{
                 background: `
                   radial-gradient(900px 500px at 82% -10%, rgba(139,92,246,0.45), transparent 60%),
                   radial-gradient(700px 450px at 8% 5%, rgba(99,102,241,0.4), transparent 60%),
                   radial-gradient(1000px 600px at 50% 115%, rgba(67,56,202,0.55), transparent 65%),
                   linear-gradient(180deg, #1e1b4b 0%, #151238 55%, #100d2e 100%)`,
                 borderRadius: '0 0 2.5rem 2.5rem',
               }}>
        <div className="grid-overlay" />
        {/* Aurora orbs */}
        <div className="hero-orb w-80 h-80 -top-20 -left-24" style={{ background: 'rgba(129,140,248,0.35)' }} />
        <div className="hero-orb w-96 h-96 top-24 -right-28" style={{ background: 'rgba(217,70,239,0.18)', animationDelay: '2s' }} />
        <div className="hero-orb w-72 h-72 bottom-10 left-1/4" style={{ background: 'rgba(251,191,36,0.12)', animationDelay: '4s' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="reveal glass-dark inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 text-indigo-100">
            🎓 İngilis Dili + TOLES Sertifikat Hazırlığı
          </div>

          <h1 className="reveal-1 relative text-4xl sm:text-6xl font-extrabold leading-[1.08] mb-5 text-white"
              style={{ letterSpacing: '-0.03em' }}>
            İngilis dilini<br />
            <span style={{
              background: 'linear-gradient(120deg, #a5b4fc 0%, #e879f9 45%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}>elmi metodla</span> mənimsə
          </h1>

          <p className="reveal-2 text-lg sm:text-xl leading-relaxed mb-8 max-w-xl mx-auto text-indigo-200">
            A1-dən C2-yə tam ingilis dili proqramı və TOLES sertifikat hazırlığı —
            SRS alqoritmi, AI müəllim, canlı yarışlarla. Öz sürətin, öz səviyyən, öz yolun.
          </p>

          <div className="reveal-3 flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link href="/register" className="btn-primary text-base !px-8 !py-3.5"
                  style={{ boxShadow: '0 10px 40px rgba(99,102,241,0.55)' }}>
              Pulsuz Başla →
            </Link>
            <Link href="/login"
                  className="glass-dark inline-flex items-center justify-center text-base font-semibold px-8 py-3.5 rounded-lg text-white transition-transform hover:-translate-y-0.5">
              Hesabım var
            </Link>
          </div>
          <p className="reveal-3 text-xs text-indigo-300/80">
            100% pulsuz · Bank kartı tələb olunmur
          </p>
        </div>

        {/* ── App preview mockup (3D maili) ───────────────────── */}
        <div className="reveal-4 relative max-w-lg mx-auto mt-14">
          {/* Glow */}
          <div className="absolute inset-x-4 top-8 bottom-0 rounded-3xl pointer-events-none"
               style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.5), rgba(217,70,239,0.3), rgba(251,191,36,0.25))', filter: 'blur(48px)' }} />

          <div className="tilt relative">
            {/* Mock dashboard card */}
            <div className="relative rounded-3xl p-5 sm:p-6"
                 style={{
                   background: 'var(--surface)',
                   border: '1px solid rgba(255,255,255,0.25)',
                   boxShadow: '0 24px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(99,102,241,0.3)',
                 }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                       style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>BE</div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Sabahın xeyir, Aysel ☀️</span>
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', color: '#c2410c', border: '1px solid #fed7aa' }}>
                  🔥 12
                </span>
              </div>

              {/* Flashcard preview */}
              <div className="rounded-2xl p-5 text-center mb-4"
                   style={{ background: 'linear-gradient(135deg, var(--brand-subtle), #ede9fe)', border: '1px solid var(--brand-light)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand)' }}>
                  Lüğət · Müqavilə hüququ
                </p>
                <p className="text-2xl font-extrabold mb-1" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                  consideration
                </p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>qarşılıq — müqavilənin əsas şərti</p>
              </div>

              {/* Progress rows */}
              <div className="space-y-2.5">
                {[
                  { label: '🗂️ Bu günün kartları', pct: 80, color: '#6366f1' },
                  { label: '✍️ Foundation testləri', pct: 62, color: '#f59e0b' },
                  { label: '📖 Unit 4 · Əmək hüququ', pct: 45, color: '#10b981' },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-2)' }}>{r.label}</span>
                      <span className="font-bold" style={{ color: r.color }}>{r.pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${r.pct}%`, background: `linear-gradient(90deg, ${r.color}, ${r.color}cc)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating chips */}
            <div className="float-slow absolute -top-4 -right-2 sm:-right-8 px-3 py-2 rounded-xl text-xs font-bold"
                 style={{ background: 'var(--surface)', border: '1px solid #a7f3d0', color: '#065f46', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
              ✓ Düzgün! +10 xal
            </div>
            <div className="float-slower absolute -bottom-4 -left-2 sm:-left-8 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                 style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
              <span className="live-dot" /> Canlı yarış dəvəti
            </div>
          </div>
        </div>

        {/* ── Stats (hero daxilində, şüşə kartlar) ─────────────── */}
        <div className="relative max-w-4xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="glass-dark rounded-2xl text-center py-5 px-3">
              <div className="text-3xl font-extrabold"
                   style={{
                     background: 'linear-gradient(120deg, #c7d2fe, #f0abfc 55%, #fcd34d)',
                     WebkitBackgroundClip: 'text',
                     backgroundClip: 'text',
                     color: 'transparent',
                     letterSpacing: '-0.02em',
                   }}>
                {s.value}
              </div>
              <div className="text-xs mt-1 font-medium text-indigo-200">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="relative px-4 py-16">
        <div className="dots-overlay" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-tag mb-3">Niyə Best English?</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-3" style={{ color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
              Əzbərləmə yox — <span className="text-gradient">elm</span>
            </h2>
            <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Hər funksiya öyrənmə psixologiyası və neyrobiologiya araşdırmalarına əsaslanır.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card"
                   style={{ ['--card-accent' as string]: f.accent } as React.CSSProperties}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                       style={{
                         background: `linear-gradient(135deg, ${f.bg}, #ffffff)`,
                         border: `1px solid ${f.accent}33`,
                         boxShadow: `0 8px 20px ${f.accent}40`,
                       }}>
                    {f.icon}
                  </div>
                  {f.live && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>
                      <span className="live-dot" /> Canlı
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text-1)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOLES Path ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-16" style={{ background: 'var(--surface-2)' }}>
        <div className="hero-orb w-72 h-72 -top-20 -right-20" style={{ background: 'rgba(99,102,241,0.1)' }} />
        <div className="hero-orb w-64 h-64 -bottom-16 -left-16" style={{ background: 'rgba(245,158,11,0.08)', animationDelay: '3s' }} />

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-tag mb-3">Sertifikat Yolu</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-3" style={{ color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
              TOLES — addım-addım zirvəyə
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TOLES_PATH.map((t) => (
              <div key={t.label} className="feature-card"
                   style={{ ['--card-accent' as string]: t.color } as React.CSSProperties}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }} />
                <div className="text-5xl font-extrabold mb-3"
                     style={{ WebkitTextStroke: `1.5px ${t.color}90`, color: 'transparent', letterSpacing: '-0.02em' }}>
                  {t.step}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{t.label}</h3>
                  <span className="badge" style={{ background: `${t.color}1a`, color: t.color, border: `1px solid ${t.color}40` }}>
                    {t.cefr}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-tag mb-3">Necə işləyir?</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-3" style={{ color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
              3 addımda başla
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative text-center px-4">
                {/* Gradient halqalı ikon */}
                <div className="inline-block p-[2px] rounded-2xl mb-4"
                     style={{ background: 'linear-gradient(135deg, var(--brand), #d946ef 60%, var(--accent))', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}>
                  <div className="w-14 h-14 rounded-[14px] flex items-center justify-center text-2xl"
                       style={{ background: 'var(--surface)' }}>
                    {s.icon}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[calc(50%+2.7rem)] right-[calc(-50%+2.7rem)]"
                       style={{ borderTop: '2px dashed var(--border-strong)' }} />
                )}
                <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text-1)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="px-4 py-16">
        <div className="relative max-w-4xl mx-auto overflow-hidden rounded-3xl p-10 sm:p-14 text-center"
             style={{
               background: `
                 radial-gradient(420px 260px at 85% -10%, rgba(217,70,239,0.4), transparent 70%),
                 radial-gradient(420px 300px at 0% 120%, rgba(165,180,252,0.4), transparent 70%),
                 linear-gradient(135deg, #6366f1 0%, #4f46e5 45%, #4338ca 100%)`,
               boxShadow: '0 20px 60px rgba(99,102,241,0.45)',
             }}>
          <div className="grid-overlay" />
          <div className="hero-orb w-44 h-44 -top-12 -left-12" style={{ background: 'rgba(255,255,255,0.14)' }} />
          <div className="hero-orb w-32 h-32 -bottom-8 right-10" style={{ background: 'rgba(251,191,36,0.2)', animationDelay: '2.5s' }} />

          <div className="relative">
            <h2 className="text-white text-3xl sm:text-4xl font-extrabold mb-3" style={{ letterSpacing: '-0.025em' }}>
              Bu gün başla, sabah fərqi gör
            </h2>
            <p className="text-indigo-200 text-base sm:text-lg mb-8 max-w-md mx-auto">
              Gündə 45 dəqiqə. Elmi metod. Görünən irəliləyiş.
            </p>
            <Link href="/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base transition-transform hover:-translate-y-0.5"
                  style={{ background: 'white', color: '#4338ca', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
              Pulsuz Hesab Yarat →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="px-4 py-8" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>BE</div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Best English</span>
          </div>
          <div className="flex items-center gap-5 text-xs" style={{ color: 'var(--text-3)' }}>
            <Link href="/privacy" className="hover:underline">Məxfilik</Link>
            <span>© 2026 Best English · İngilis Dili + TOLES Platforması</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
