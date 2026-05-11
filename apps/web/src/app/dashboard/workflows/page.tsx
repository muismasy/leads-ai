"use client";
import { Zap, Plus, ArrowRight, PlayCircle } from "lucide-react";

export default function WorkflowsPage() {
  const workflows = [
    { id: "1", name: "Auto Follow-up (3 hari)", trigger: "Tidak ada respons 3 hari", actions: ["Kirim pesan reminder", "Tambah tag 'follow-up'"], active: true, triggered: 45 },
    { id: "2", name: "Welcome New Lead", trigger: "Kontak baru dibuat", actions: ["Kirim welcome message", "Assign ke AI Agent"], active: true, triggered: 128 },
    { id: "3", name: "Escalation Alert", trigger: "AI escalate ke human", actions: ["Notifikasi Slack", "Assign ke agent terbaik"], active: true, triggered: 23 },
    { id: "4", name: "Deal Won Notification", trigger: "Deal stage = Won", actions: ["Kirim konfirmasi ke customer", "Update CRM stage"], active: false, triggered: 8 },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Workflows</h1>
        </div>
        <button className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all flex items-center gap-2">
          <Plus size={14} strokeWidth={2} />
          Buat Workflow
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-3">
        {workflows.map((wf, i) => (
          <div key={wf.id} className="glass rounded-xl p-5 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${wf.active ? "bg-success animate-pulse-dot" : "bg-[var(--color-text-muted)]"}`} />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{wf.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--color-text-muted)]">{wf.triggered}× triggered</span>
                <button className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${wf.active ? "bg-success/15 text-success" : "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]"}`}>
                  {wf.active ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-brand-600/10 text-brand-400 font-medium flex items-center gap-1.5">
                <PlayCircle size={12} strokeWidth={1.5} /> {wf.trigger}
              </span>
              <ArrowRight size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
              {wf.actions.map((a, j) => (
                <span key={j} className="px-2 py-1 rounded-lg bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]">{a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
