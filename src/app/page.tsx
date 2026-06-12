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
    desc: 'Müqavilə, məhkəmə, əmək, tort hüququ — hər dərsdə qrammatika, oxuma və yazma məşqi.',
  },
  {
    icon: '⚔️', bg: '#fee2e2', accent: '#ef4444', live: true,
    title: 'Canlı Yarış',
    desc: 'Dostunu email ilə tap, canlı TOLES Mini-Test yarışında 30 saniyəlik raundlarda üz-üzə gəl.',
  },
  {
    icon: '🤖', bg: '#e0f2fe', accent: '#0ea5e9',
    title: 'AI Müəllim',
    desc: 'Yazını yoxlayır, səhvini izah edir, suallarını cavablayır — öz pulsuz Gemini açarınla, limitsiz.',
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

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative px-4 pt-16 pb-10 sm:pt-24">
        {/* Aurora orbs */}
        <div className="hero-orb w-72 h-72 -top-10 -left-20" style={{ background: 'rgba(99,102,241,0.18)' }} />
        <div className="hero-orb w-80 h-80 top-20 -right-24" style={{ background: 'rgba(245,158,11,0.13)', animationDelay: '2s' }} />
        <div className="hero-orb w-64 h-64 bottom-0 left-1/3" style={{ background: 'rgba(139,92,246,0.13)', animationDelay: '4s' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="reveal inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
               style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-light)', color: 'var(--brand-dark)' }}>
            ⚖️ TOLES Sertifikat Hazırlığı + İngilis Dili
          </div>

          <h1 className="reveal-1 text-4xl sm:text-6xl font-extrabold leading-[1.08] mb-5"
              style={{ color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            Hüquq ingiliscəsini<br />
            <span className="text-gradient">elmi metodla</span> mənimsə
          </h1>

          <p className="reveal-2 text-lg sm:text-xl leading-relaxed mb-8 max-w-xl mx-auto" style={{ color: 'var(--text-2)' }}>
            SRS alqoritmi, AI müəllim və canlı yarışlarla TOLES sertifikatına hazırlaş.
            Öz sürətin, öz səviyyən, öz yolun.
          </p>

          <div className="reveal-3 flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link href="/register" className="btn-primary text-base !px-7 !py-3">
              Pulsuz Başla →
            </Link>
            <Link href="/login" className="btn-secondary text-base !px-7 !py-3">
              Hesabım var
            </Link>
          </div>
          <p className="reveal-3 text-xs" style={{ color: 'var(--text-3)' }}>
            100% pulsuz · Bank kartı tələb olunmur
          </p>
        </div>

        {/* ── App preview mockup ──────────────────────────────── */}
        <div className="reveal-4 relative max-w-lg mx-auto mt-14">
          {/* Glow */}
          <div className="absolute inset-x-6 top-6 bottom-0 rounded-3xl pointer-events-none"
               style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(245,158,11,0.2))', filter: 'blur(40px)' }} />

          {/* Mock dashboard card */}
          <div className="relative rounded-3xl p-5 sm:p-6"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-hover)' }}>
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
                { label: '📖 Unit 4 · Tort hüququ', pct: 45, color: '#10b981' },
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
               style={{ background: 'var(--surface)', border: '1px solid #a7f3d0', color: '#065f46', boxShadow: 'var(--shadow-card)' }}>
            ✓ Düzgün! +10 xal
          </div>
          <div className="float-slower absolute -bottom-4 -left-2 sm:-left-8 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', boxShadow: 'var(--shadow-card)' }}>
            <span className="live-dot" /> Canlı yarış dəvəti
          </div>
        </div>
      </section>

      {/* ── Stats band ─────────────────────────────────────────── */}
      <section className="px-4 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="card text-center !py-5">
              <div className="text-3xl font-extrabold text-gradient" style={{ letterSpacing: '-0.02em' }}>{s.value}</div>
              <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-2)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="px-4 py-14">
        <div className="max-w-5xl mx-auto">
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
              <div key={f.title} className="card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                       style={{ background: f.bg }}>
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
      <section className="px-4 py-14" style={{ background: 'var(--surface-2)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-tag mb-3">Sertifikat Yolu</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-3" style={{ color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
              TOLES — addım-addım zirvəyə
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TOLES_PATH.map((t) => (
              <div key={t.label} className="card-hover relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: t.color }} />
                <div className="text-4xl font-extrabold mb-3" style={{ color: `${t.color}33` }}>{t.step}</div>
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
      <section className="px-4 py-14">
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
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-4"
                     style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-light)' }}>
                  {s.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] h-px"
                       style={{ background: 'var(--border-strong)' }} />
                )}
                <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text-1)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="px-4 py-14">
        <div className="relative max-w-4xl mx-auto overflow-hidden rounded-3xl p-10 sm:p-14 text-center"
             style={{
               background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 45%, #4338ca 100%)',
               boxShadow: '0 16px 48px rgba(99,102,241,0.4)',
             }}>
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(360px 220px at 85% -10%, rgba(251,191,36,0.3), transparent 70%), radial-gradient(400px 280px at 0% 120%, rgba(165,180,252,0.35), transparent 70%)' }} />
          <div className="hero-orb w-40 h-40 -top-10 -left-10" style={{ background: 'rgba(255,255,255,0.12)' }} />

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
            <span>© 2026 Best English · TOLES Hazırlıq Platforması</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
