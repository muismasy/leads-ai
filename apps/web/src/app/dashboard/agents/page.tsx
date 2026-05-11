"use client";
import { Bot, Plus, Cpu, Sliders, ShieldCheck } from "lucide-react";

export default function AgentsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">AI Agents</h1>
        </div>
        <button className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all flex items-center gap-2">
          <Plus size={14} strokeWidth={2} />
          Buat Agent
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="glass rounded-xl p-6 max-w-2xl animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Bot size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Sales AI</h2>
              <p className="text-xs text-success font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Aktif · Gemini 2.0 Flash
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">System Prompt</label>
              </div>
              <textarea rows={5} defaultValue="Anda adalah Asisten Sales AI Profesional. Tugas Anda adalah menyapa pelanggan, menjawab pertanyaan, dan membantu proses penjualan..."
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-brand-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Model</label>
                </div>
                <select className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none">
                  <option>Gemini 2.0 Flash</option>
                  <option>GPT-4o</option>
                  <option>Claude 3.5 Sonnet</option>
                </select>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sliders size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Temperature</label>
                </div>
                <input type="range" min="0" max="100" defaultValue="30" className="w-full accent-brand-500" />
                <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]"><span>Presisi</span><span>Kreatif</span></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Tools / Kemampuan</label>
              <div className="flex flex-wrap gap-2">
                {["Escalate ke CS", "Buat Deal", "Cek Ongkir", "Kirim Invoice", "Tambah Tag", "Follow-up"].map((tool) => (
                  <label key={tool} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-secondary)] cursor-pointer hover:border-brand-500/50 transition-all">
                    <input type="checkbox" defaultChecked={["Escalate ke CS", "Buat Deal", "Tambah Tag"].includes(tool)} className="accent-brand-500" />
                    {tool}
                  </label>
                ))}
              </div>
            </div>
            <button className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all">Simpan Perubahan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
