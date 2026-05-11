"use client";
import { useState } from "react";
import { Users, Plus, Search, MessageSquare, Instagram, Mail } from "lucide-react";

const MOCK_CONTACTS = [
  { id: "1", name: "Rina Widya", phone: "+628123456789", email: "rina@example.com", channel: "whatsapp", stage: "prospect", score: 72, tags: ["F&B", "Premium"], lastActivity: "2 menit lalu" },
  { id: "2", name: "Budi Hartono", phone: "+628198765432", email: "budi@example.com", channel: "whatsapp", stage: "customer", score: 95, tags: ["Retail", "VIP"], lastActivity: "15 menit lalu" },
  { id: "3", name: "Sari Dewi", phone: "+628134567890", email: "sari@example.com", channel: "instagram", stage: "lead", score: 45, tags: ["Beauty"], lastActivity: "1 jam lalu" },
  { id: "4", name: "Ahmad Fauzi", phone: "+628145678901", email: null, channel: "whatsapp", stage: "lead", score: 30, tags: ["Tech"], lastActivity: "3 jam lalu" },
  { id: "5", name: "Lisa Permata", phone: "+628156789012", email: "lisa@example.com", channel: "whatsapp", stage: "customer", score: 88, tags: ["Fashion", "Repeat"], lastActivity: "5 jam lalu" },
];

const STAGE_BADGE: Record<string, string> = {
  lead: "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]",
  prospect: "bg-brand-600/15 text-brand-400",
  customer: "bg-success/15 text-success",
  churned: "bg-danger/15 text-danger",
};

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Users size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Kontak</h1>
        </div>
        <button className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all flex items-center gap-2">
          <Plus size={14} strokeWidth={2} />
          Tambah Kontak
        </button>
      </div>

      {/* Search & Filters */}
      <div className="px-6 py-3 flex gap-3 border-b border-[var(--color-border-subtle)] shrink-0 items-center">
        <div className="flex-1 relative">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau nomor..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-brand-500"
          />
        </div>
        <select className="px-3 py-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)] focus:outline-none">
          <option>Semua Stage</option>
          <option>Lead</option>
          <option>Prospect</option>
          <option>Customer</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[var(--color-surface)]">
            <tr className="border-b border-[var(--color-border-subtle)]">
              {["Nama", "Channel", "Stage", "Lead Score", "Tags", "Aktivitas Terakhir"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact, i) => (
              <tr key={contact.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600/30 to-brand-400/10 flex items-center justify-center text-brand-400 text-xs font-semibold shrink-0">
                      {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{contact.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{contact.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-xs text-[var(--color-text-secondary)]">
                  <div className="flex items-center gap-1.5">
                    {contact.channel === "whatsapp" ? <MessageSquare size={12} strokeWidth={1.5} /> : <Instagram size={12} strokeWidth={1.5} />}
                    {contact.channel === "whatsapp" ? "WhatsApp" : "Instagram"}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${STAGE_BADGE[contact.stage]}`}>{contact.stage}</span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-[var(--color-surface-overlay)]">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${contact.score}%` }} />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">{contact.score}</span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-1">
                    {contact.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-brand-600/10 text-brand-400 text-[9px] font-medium">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-3 text-xs text-[var(--color-text-muted)]">{contact.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
