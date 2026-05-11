"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import QRCode from "react-qr-code";
import { Loader2, RefreshCw, Smartphone, CheckCircle2, AlertCircle, X, MessageSquare, Instagram, Send, Plug2 } from "lucide-react";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const fetchChannels = async () => {
    try {
      const res = await apiFetch("/channels");
      setChannels(res.data);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    const interval = setInterval(fetchChannels, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (channelType: string) => {
    try {
      // 1. Check if channel exists in DB
      let channel = channels.find(c => c.channel === channelType);
      
      if (!channel) {
        const res = await apiFetch("/channels", {
          method: "POST",
          body: JSON.stringify({ channel: channelType, config: {} }),
        });
        channel = res.data;
        setChannels([...channels, channel]);
      }

      // 2. Trigger connection
      setConnectingId(channel.id);
      await apiFetch(`/channels/${channel.id}/connect`, { method: "POST" });
      await fetchChannels();
    } catch (err) {
      alert("Gagal memulai koneksi");
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin memutuskan koneksi ini?")) return;
    try {
      await apiFetch(`/channels/${id}`, { method: "DELETE" });
      fetchChannels();
    } catch (err) {
      alert("Gagal menghapus koneksi");
    }
  };

  const channelTypes = [
    { type: "whatsapp", name: "WhatsApp", icon: MessageSquare, color: "var(--color-whatsapp)" },
    { type: "instagram", name: "Instagram", icon: Instagram, color: "var(--color-instagram)" },
    { type: "telegram", name: "Telegram", icon: Send, color: "var(--color-telegram)" },
  ];

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center border-b border-[var(--color-border-subtle)] shrink-0 gap-2">
        <Plug2 size={18} strokeWidth={1.5} className="text-[var(--color-text-primary)]" />
        <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Channels</h1>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <p className="text-xs text-[var(--color-text-muted)] mb-6">
          Hubungkan channel messaging Anda. Semua pesan masuk akan dikelola oleh AI Agent dari satu inbox terpusat.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channelTypes.map((ct) => {
            const activeConn = channels.find(c => c.channel === ct.type);
            const isConnecting = connectingId === activeConn?.id;
            
            return (
              <div key={ct.type} className="glass rounded-2xl p-5 border border-[var(--color-border-default)] flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: ct.color + "15" }}>
                      <ct.icon size={24} strokeWidth={1.5} style={{ color: ct.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{ct.name}</h3>
                      <StatusBadge status={activeConn?.status || "disconnected"} />
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center py-4">
                  {activeConn?.status === "waiting_qr" && activeConn.metadata?.qr ? (
                    <div className="flex flex-col items-center gap-4 bg-white p-4 rounded-xl">
                      <QRCode value={activeConn.metadata.qr} size={160} />
                      <p className="text-[10px] text-gray-500 text-center px-4">
                        Scan QR ini menggunakan aplikasi WhatsApp di ponsel Anda (Settings {">"} Linked Devices)
                      </p>
                    </div>
                  ) : activeConn?.status === "connecting" || isConnecting ? (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                      <p className="text-xs text-[var(--color-text-muted)]">Menyiapkan koneksi...</p>
                    </div>
                  ) : activeConn?.status === "connected" ? (
                    <div className="space-y-3 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border-subtle)]">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">Nomor</span>
                        <span className="text-[var(--color-text-primary)] font-mono">{activeConn.connectedPhone || "Aktif"}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">Device</span>
                        <span className="text-[var(--color-text-primary)]">{activeConn.connectedName || "Web Session"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 opacity-40">
                      <Smartphone className="w-10 h-10 mx-auto mb-2 text-[var(--color-text-muted)]" />
                      <p className="text-[10px]">Belum ada koneksi aktif</p>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  {activeConn?.status === "connected" ? (
                    <button 
                      onClick={() => handleDisconnect(activeConn.id)}
                      className="w-full py-2.5 rounded-xl text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-all border border-danger/20"
                    >
                      Putuskan Koneksi
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleConnect(ct.type)}
                      disabled={isConnecting || activeConn?.status === "connecting" || activeConn?.status === "waiting_qr"}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {activeConn?.status === "waiting_qr" ? "Menunggu Scan..." : `Hubungkan ${ct.name}`}
                    </button>
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return (
        <div className="flex items-center gap-1 text-[10px] text-success font-medium">
          <CheckCircle2 className="w-3 h-3" /> Terhubung
        </div>
      );
    case "waiting_qr":
      return (
        <div className="flex items-center gap-1 text-[10px] text-brand-400 font-medium animate-pulse">
          <Smartphone className="w-3 h-3" /> Menunggu Scan
        </div>
      );
    case "connecting":
      return (
        <div className="flex items-center gap-1 text-[10px] text-warning font-medium">
          <RefreshCw className="w-3 h-3 animate-spin" /> Menghubungkan...
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <AlertCircle className="w-3 h-3" /> Tidak Terhubung
        </div>
      );
  }
}
