"use client";
import { useState } from "react";
import { Target, Plus, User, Clock, CheckCircle2 } from "lucide-react";

const STAGES = [
  { key: "new", label: "Lead Baru", color: "var(--color-text-muted)", deals: [
    { id: "d1", title: "Paket Premium F&B", value: 15000000, contact: "Rina Widya", daysOpen: 2 },
    { id: "d2", title: "Custom AI Agent", value: 25000000, contact: "Ahmad Fauzi", daysOpen: 5 },
  ]},
  { key: "qualified", label: "Qualified", color: "var(--color-info)", deals: [
    { id: "d3", title: "Enterprise CRM", value: 50000000, contact: "Budi Hartono", daysOpen: 8 },
  ]},
  { key: "proposal", label: "Proposal", color: "var(--color-warning)", deals: [
    { id: "d4", title: "Paket Starter", value: 5000000, contact: "Sari Dewi", daysOpen: 3 },
  ]},
  { key: "negotiation", label: "Negosiasi", color: "#8B5CF6", deals: [
    { id: "d5", title: "Multi-Outlet Package", value: 35000000, contact: "Lisa Permata", daysOpen: 12 },
  ]},
  { key: "won", label: "Won", color: "var(--color-success)", deals: [] },
];

function formatIDR(num: number) {
  return "Rp " + new Intl.NumberFormat("id-ID").format(num);
}

export default function DealsPage() {
  const totalValue = STAGES.flatMap(s => s.deals).reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Sales Pipeline</h1>
          </div>
          <span className="text-xs text-[var(--color-text-muted)] border-l border-[var(--color-border-subtle)] pl-4">Total: {formatIDR(totalValue)}</span>
        </div>
        <button className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all flex items-center gap-2">
          <Plus size={14} strokeWidth={2} />
          Buat Deal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {STAGES.map((stage) => {
            const stageTotal = stage.deals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.key} className="w-[280px] flex flex-col bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border-default)]">
                {/* Stage Header */}
                <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">{stage.label}</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{stage.deals.length}</span>
                  </div>
                  {stageTotal > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)]">{formatIDR(stageTotal)}</p>
                  )}
                </div>

                {/* Deal Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stage.deals.map((deal, i) => (
                    <div key={deal.id} className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-default)] hover:border-brand-500/30 transition-all cursor-pointer group animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-brand-400 transition-colors">{deal.title}</p>
                      <p className="text-xs text-brand-400 font-semibold mt-1">{formatIDR(deal.value)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <User size={10} strokeWidth={1.5} /> {deal.contact}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <Clock size={10} strokeWidth={1.5} /> {deal.daysOpen}d
                        </span>
                      </div>
                    </div>
                  ))}
                  {stage.deals.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-[var(--color-text-muted)] text-xs">Belum ada deal</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
