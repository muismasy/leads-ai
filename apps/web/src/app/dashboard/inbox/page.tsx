import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { io } from "socket.io-client";
import { 
  MessageSquare, 
  Instagram, 
  Send, 
  Globe, 
  Mail, 
  Bot, 
  Bell, 
  User, 
  CheckCircle,
  UserCheck,
  X,
  Target,
  Tag,
  FileText,
  Send as SendIcon,
  Search
} from "lucide-react";

// Mock data as fallback
const MOCK_CONVERSATIONS = [
  { id: "1", name: "Rina Widya", phone: "+628123456789", channel: "whatsapp", lastMessage: "Kak, harga paket premium berapa ya?", time: "2m", unread: 2, status: "ai_active", avatar: "RW" },
  { id: "2", name: "Budi Hartono", phone: "+628198765432", channel: "whatsapp", lastMessage: "Oke kak, saya mau order yang kemarin", time: "15m", unread: 0, status: "human_active", avatar: "BH" },
  { id: "3", name: "Sari Dewi", phone: "+628134567890", channel: "whatsapp", lastMessage: "Apakah ada garansi untuk produk ini?", time: "1h", unread: 1, status: "needs_human", avatar: "SD" },
  { id: "4", name: "Ahmad Fauzi", phone: "+628145678901", channel: "instagram", lastMessage: "Mau tanya dong kak soal pengiriman", time: "3h", unread: 0, status: "ai_active", avatar: "AF" },
  { id: "5", name: "Lisa Permata", phone: "+628156789012", channel: "whatsapp", lastMessage: "Terima kasih kak! Sudah sampai barangnya", time: "5h", unread: 0, status: "closed", avatar: "LP" },
];

const MOCK_MESSAGES = [
  { id: "m1", senderType: "contact", content: "Halo kak, saya mau tanya tentang paket premium", time: "14:20" },
  { id: "m2", senderType: "ai", content: "Halo Kak Rina! Terima kasih sudah menghubungi kami. Untuk paket premium, kami memiliki beberapa pilihan yang bisa disesuaikan dengan kebutuhan bisnis Anda. Boleh tahu bisnis Kak Rina di bidang apa?", time: "14:20" },
  { id: "m3", senderType: "contact", content: "Saya di bidang F&B kak, punya 3 outlet", time: "14:22" },
  { id: "m4", senderType: "ai", content: "Wah keren! Untuk bisnis F&B dengan 3 outlet, kami rekomendasikan Paket Pro yang sudah include multi-outlet management. Kak Rina mau saya jelaskan detailnya atau langsung connect ke tim sales kami?", time: "14:22" },
  { id: "m5", senderType: "contact", content: "Kak, harga paket premium berapa ya?", time: "14:25" },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  ai_active: { label: "AI", color: "bg-brand-600/20 text-brand-400" },
  human_active: { label: "Agent", color: "bg-success/20 text-success" },
  needs_human: { label: "Butuh CS", color: "bg-warning/20 text-warning" },
  closed: { label: "Selesai", color: "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]" },
};

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: MessageSquare, 
  instagram: Instagram, 
  telegram: Send, 
  webchat: Globe, 
  email: Mail,
};

export default function InboxPage() {
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();

    const socket = io(process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000", {
      auth: { token: localStorage.getItem("token") }
    });

    socket.on("message:new", (newMsg) => {
      if (newMsg.conversationId === selectedId) {
        setMessagesList(prev => [...prev, newMsg]);
      }
      fetchConversations(); // Refresh list to update preview/unread
    });

    socket.on("conversation:updated", () => {
      fetchConversations();
    });

    return () => { socket.disconnect(); };
  }, [selectedId]);

  async function fetchConversations() {
    try {
      const data = await apiFetch("/conversations");
      setConversationsList(data.data.length > 0 ? data.data : MOCK_CONVERSATIONS);
    } catch (err) {
      setConversationsList(MOCK_CONVERSATIONS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedId && !selectedId.startsWith("mock")) {
      fetchMessages(selectedId);
    } else {
      setMessagesList(MOCK_MESSAGES);
    }
  }, [selectedId]);

  async function fetchMessages(id: string) {
    try {
      const data = await apiFetch(`/messages/${id}`);
      setMessagesList(data.data);
    } catch (err) {
      setMessagesList([]);
    }
  }

  async function handleSendMessage() {
    if (!message.trim() || !selectedId) return;
    
    // Optimistic update for UI feel
    const tempMsg = { id: Date.now().toString(), senderType: 'agent', content: message, time: new Date().toLocaleTimeString() };
    setMessagesList(prev => [...prev, tempMsg]);
    const currentMsg = message;
    setMessage("");

    try {
      if (!selectedId.startsWith("mock")) {
        await apiFetch(`/messages/${selectedId}`, {
          method: 'POST',
          body: JSON.stringify({ content: currentMsg })
        });
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
    }
  }

  const selected = conversationsList.find((c) => c.id === selectedId);
  const filtered = filter === "all"
    ? conversationsList
    : conversationsList.filter((c) => c.status === filter);

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="w-[340px] border-r border-[var(--color-border-default)] flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Inbox</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">{filtered.length} percakapan</span>
          </div>
        </div>

        {/* Filters */}
        <div className="px-3 py-2 flex gap-1.5 border-b border-[var(--color-border-subtle)] shrink-0 overflow-x-auto">
          {[
            { key: "all", label: "Semua" },
            { key: "ai_active", label: "AI", icon: Bot },
            { key: "needs_human", label: "Pending", icon: Bell },
            { key: "human_active", label: "Agent", icon: User },
            { key: "closed", label: "Selesai", icon: CheckCircle },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === f.key
                  ? "bg-brand-600/15 text-brand-400 border border-brand-500/30"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent"
              }`}
            >
              {f.icon && <f.icon size={12} strokeWidth={1.5} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv) => (
            <button key={conv.id} onClick={() => setSelectedId(conv.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-[var(--color-border-subtle)] ${
                selectedId === conv.id
                  ? "bg-brand-600/5 border-l-2 border-l-brand-500"
                  : "hover:bg-[var(--color-surface-raised)] border-l-2 border-l-transparent"
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600/30 to-brand-400/10 flex items-center justify-center text-brand-400 text-xs font-semibold shrink-0 mt-0.5">
                {conv.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{conv.name}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{conv.time}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{conv.lastMessage}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {(() => {
                    const Icon = CHANNEL_ICONS[conv.channel] || MessageSquare;
                    return <Icon size={12} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />;
                  })()}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${STATUS_BADGES[conv.status]?.color}`}>
                    {STATUS_BADGES[conv.status]?.label}
                  </span>
                  {conv.unread > 0 && (
                    <span className="ml-auto w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center">{conv.unread}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-5 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600/30 to-brand-400/10 flex items-center justify-center text-brand-400 text-xs font-semibold">
                  {selected.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{selected.name}</h3>
                  <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                    {selected.phone} · {(() => {
                      const Icon = CHANNEL_ICONS[selected.channel] || MessageSquare;
                      return <Icon size={10} strokeWidth={1.5} />;
                    })()} WhatsApp
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-all flex items-center gap-1.5">
                  <UserCheck size={14} strokeWidth={1.5} /> Ambil Alih
                </button>
                <button className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-all">
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {MOCK_MESSAGES.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderType === "contact" ? "justify-start" : "justify-end"} animate-fade-in`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.senderType === "contact"
                      ? "bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] rounded-bl-md"
                      : msg.senderType === "ai"
                        ? "bg-brand-600/15 text-[var(--color-text-primary)] border border-brand-500/20 rounded-br-md"
                        : "bg-brand-600 text-white rounded-br-md"
                  }`}>
                    {msg.senderType === "ai" && (
                      <span className="text-[9px] font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Bot size={10} strokeWidth={2} /> AI Agent
                      </span>
                    )}
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.senderType === "contact" ? "text-[var(--color-text-muted)]" : "text-brand-300/60"}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-[var(--color-border-subtle)] shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder="Ketik pesan..."
                    rows={1}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>
                <button 
                  onClick={handleSendMessage}
                  className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-brand-600/25 shrink-0 flex items-center gap-2"
                >
                  <SendIcon size={16} strokeWidth={2} />
                  Kirim
                </button>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2 flex items-center gap-1.5">
                <Bot size={10} strokeWidth={1.5} />
                AI sedang menangani percakapan ini · Tekan "Ambil Alih" untuk membalas manual
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} strokeWidth={1} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Pilih percakapan</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Gunakan sidebar untuk mulai membalas pesan</p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Detail Panel */}
      {selected && (
        <div className="w-[280px] border-l border-[var(--color-border-default)] overflow-y-auto p-5 animate-slide-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-600/30 to-brand-400/10 flex items-center justify-center text-brand-400 text-lg font-semibold mx-auto mb-3">
              {selected.avatar}
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{selected.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">{selected.phone}</p>
          </div>

          <div className="space-y-4">
            {/* Quick Info */}
            <div className="glass rounded-xl p-3 space-y-2">
              <h4 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Info Kontak</h4>
              {[
                { label: "Channel", value: "WhatsApp" },
                { label: "Stage", value: "Lead" },
                { label: "Lead Score", value: "72/100" },
                { label: "Pertama Chat", value: "8 Mei 2026" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">{item.label}</span>
                  <span className="text-[var(--color-text-secondary)] font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="glass rounded-xl p-3">
              <h4 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {["F&B", "3 Outlet", "Premium"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-brand-600/10 text-brand-400 text-[10px] font-medium">{tag}</span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-overlay)] transition-all flex items-center gap-2">
                <Target size={14} strokeWidth={1.5} /> Buat Deal
              </button>
              <button className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-overlay)] transition-all flex items-center gap-2">
                <Tag size={14} strokeWidth={1.5} /> Tambah Tag
              </button>
              <button className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-overlay)] transition-all flex items-center gap-2">
                <FileText size={14} strokeWidth={1.5} /> Tambah Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
