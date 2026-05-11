import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col">
      {/* Nav */}
      <nav className="glass fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white font-bold text-sm">L</div>
          <span className="text-lg font-bold text-[var(--color-text-primary)]">LeadsAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            Masuk
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all hover:shadow-lg hover:shadow-brand-600/25">
            Mulai Gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 pt-24">
        <div className="max-w-3xl text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-600/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-dot"></span>
            AI Agent Platform #1 Indonesia
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            <span className="gradient-text">AI Sales Agent</span>
            <br />
            <span className="text-[var(--color-text-primary)]">yang Closing 24/7</span>
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
            Otomatiskan customer service & sales via WhatsApp dengan AI yang memahami konteks, menutup penjualan, dan tidak pernah tidur.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-3.5 text-base font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5">
              Coba Gratis Sekarang
            </Link>
            <Link href="#demo" className="px-8 py-3.5 text-base font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-default)] rounded-xl hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all">
              Lihat Demo
            </Link>
          </div>
          <p className="mt-6 text-xs text-[var(--color-text-muted)]">
            Tanpa kartu kredit · Setup dalam 5 menit · 500 AI credits gratis
          </p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "42%", label: "Peningkatan Sales" },
              { value: "20×", label: "Hemat Biaya CS" },
              { value: "24/7", label: "Always Online" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
