"use client";
import { BarChart3, MessageSquare, Bot, Zap, Target, Users, Coins } from "lucide-react";

export default function AnalyticsPage() {
  const stats = [
    { label: "Total Percakapan", value: "1,247", change: "+12%", icon: MessageSquare, color: "text-brand-400" },
    { label: "Ditangani AI", value: "89%", change: "+5%", icon: Bot, color: "text-purple-400" },
    { label: "Avg. Response Time", value: "1.2s", change: "-0.3s", icon: Zap, color: "text-yellow-400" },
    { label: "Deals Won", value: "Rp 125jt", change: "+18%", icon: Target, color: "text-success" },
    { label: "Total Kontak", value: "523", change: "+34", icon: Users, color: "text-blue-400" },
    { label: "AI Credits Used", value: "3,240", change: "/ 10,000", icon: Coins, color: "text-orange-400" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center border-b border-[var(--color-border-subtle)] shrink-0 gap-2">
        <BarChart3 size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
        <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Analytics</h1>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className="glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={20} strokeWidth={1.5} className={stat.color} />
                <span className="text-[10px] font-medium text-success">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* AI vs Human Chart Placeholder */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Performa AI vs Human Agent (30 hari)</h3>
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="flex items-end gap-1 h-32">
                {[65, 70, 75, 80, 72, 85, 88, 90, 87, 92, 89, 91].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-brand-500/30 transition-all hover:bg-brand-500/50" style={{ height: `${v}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[9px] text-[var(--color-text-muted)]">
                <span>Apr</span><span>Mei</span>
              </div>
            </div>
            <div className="w-40 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5 items-center">
                  <span className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <Bot size={14} strokeWidth={1.5} className="text-brand-400" />
                    AI Handled
                  </span>
                  <span className="text-brand-400 font-semibold">89%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-overlay)]">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: "89%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5 items-center">
                  <span className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <User size={14} strokeWidth={1.5} className="text-success" />
                    Human
                  </span>
                  <span className="text-success font-semibold">11%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-overlay)]">
                  <div className="h-full rounded-full bg-success" style={{ width: "11%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5 items-center">
                  <span className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <Zap size={14} strokeWidth={1.5} className="text-warning" />
                    Escalated
                  </span>
                  <span className="text-warning font-semibold">7%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-overlay)]">
                  <div className="h-full rounded-full bg-warning" style={{ width: "7%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
