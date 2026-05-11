"use client";
import { BookOpen, FileText, Globe, HelpCircle, PencilLine, Upload } from "lucide-react";

const MOCK_DOCS = [
  { id: "1", title: "Katalog Produk 2026", sourceType: "file", status: "ready", chunks: 47, updatedAt: "2 jam lalu" },
  { id: "2", title: "FAQ Pengiriman & Retur", sourceType: "faq", status: "ready", chunks: 12, updatedAt: "1 hari lalu" },
  { id: "3", title: "Panduan Harga & Promo", sourceType: "manual", status: "ready", chunks: 23, updatedAt: "3 hari lalu" },
  { id: "4", title: "Website Company Profile", sourceType: "url", status: "processing", chunks: 0, updatedAt: "Baru saja" },
];

const SOURCE_ICONS: Record<string, any> = { 
  file: FileText, 
  url: Globe, 
  faq: HelpCircle, 
  manual: PencilLine 
};

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  ready: { label: "Siap", class: "bg-success/15 text-success" },
  processing: { label: "Memproses...", class: "bg-warning/15 text-warning" },
  error: { label: "Error", class: "bg-danger/15 text-danger" },
};

export default function KnowledgePage() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Knowledge Base</h1>
        </div>
        <button className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all flex items-center gap-2">
          <Upload size={14} strokeWidth={2} />
          Upload Dokumen
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Dokumen yang di-upload akan dipecah menjadi chunk dan dikonversi menjadi vector embeddings agar AI Agent dapat menjawab berdasarkan knowledge Anda.</p>
        <div className="grid gap-3">
          {MOCK_DOCS.map((doc, i) => {
            const Icon = SOURCE_ICONS[doc.sourceType] || FileText;
            return (
              <div key={doc.id} className="glass rounded-xl p-4 flex items-center gap-4 hover:border-brand-500/30 transition-all cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-overlay)] flex items-center justify-center text-brand-400 shrink-0">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{doc.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{doc.chunks} chunks · Diperbarui {doc.updatedAt}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[doc.status]?.class}`}>
                  {STATUS_BADGE[doc.status]?.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
