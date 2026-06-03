import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-6 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
          🎓 TOLES Sertifikat Hazırlığı + İngilis Dili
        </div>

        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          Best <span className="text-blue-600">English</span>
        </h1>

        <p className="text-xl text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Elmi əsaslı metod ilə ingilis dilini öyrən.<br />
          Öz sürətin, öz səviyyən, öz yolun.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="btn-primary text-center">
            Pulsuz Başla →
          </Link>
          <Link href="/login" className="btn-secondary text-center">
            Daxil Ol
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        {[
          { icon: '💡', title: 'Elmi SRS Sistemi', desc: 'Ebbinghaus metoduna əsaslanan ağıllı lüğət kartları', glow: true },
          { icon: '📊', title: 'Şəxsi Statistika', desc: 'İrəliləyişini real vaxtda izlə, zəif nöqtələri gör', glow: false },
          { icon: '⚖️', title: 'TOLES Hazırlığı', desc: 'Foundation, Higher, Advanced — istədiyin səviyyədən başla', glow: false },
        ].map((f) => (
          <div key={f.title} className="card text-center">
            <div className={`text-4xl mb-3 ${f.glow ? 'animate-pulse drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]' : ''}`}>
              {f.icon}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
