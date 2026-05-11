"use client";
import { Settings, User, Globe, CreditCard, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center border-b border-[var(--color-border-subtle)] shrink-0 gap-2">
        <Settings size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
        <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Pengaturan</h1>
      </div>
      <div className="flex-1 overflow-auto p-6 max-w-2xl space-y-6">
        {/* Company */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} strokeWidth={1.5} className="text-brand-400" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Profil Perusahaan</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Nama Perusahaan</label>
              <input defaultValue="Demo Company" className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Timezone</label>
              <select className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none">
                <option>Asia/Jakarta (WIB)</option>
                <option>Asia/Makassar (WITA)</option>
                <option>Asia/Jayapura (WIT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User size={16} strokeWidth={1.5} className="text-brand-400" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Tim Agent</h3>
            </div>
            <button className="text-xs text-brand-400 hover:text-brand-300 font-medium">+ Undang</button>
          </div>
          {[
            { name: "Admin Demo", email: "admin@demo.com", role: "Owner", online: true },
            { name: "Rina Sari", email: "rina.sari@demo.com", role: "Agent", online: true },
            { name: "Budi Santoso", email: "budi.santoso@demo.com", role: "Agent", online: false },
          ].map((m) => (
            <div key={m.email} className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border-subtle)] last:border-0">
              <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-semibold">{m.name[0]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[var(--color-text-primary)]">{m.name}</p>
                  {m.online && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">{m.email}</p>
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-[var(--color-surface-overlay)]">{m.role}</span>
            </div>
          ))}
        </div>

        {/* Plan */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} strokeWidth={1.5} className="text-brand-400" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Plan & Billing</h3>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-lg bg-brand-600/15 text-brand-400 text-xs font-bold uppercase">Pro Plan</span>
            <span className="text-xs text-[var(--color-text-muted)]">10,000 AI credits / bulan</span>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--color-text-muted)]">AI Credits terpakai</span>
              <span className="text-[var(--color-text-secondary)]">3,240 / 10,000</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--color-surface-overlay)]">
              <div className="h-full rounded-full bg-brand-500" style={{ width: "32.4%" }} />
            </div>
          </div>
          <button className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
            Upgrade Plan <ChevronRight size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
