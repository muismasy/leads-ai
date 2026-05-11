"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  MessageSquare, 
  Users, 
  Target, 
  BookOpen, 
  Bot, 
  Zap, 
  BarChart3, 
  Plug2, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard/inbox", icon: MessageSquare, label: "Inbox", badge: true },
  { href: "/dashboard/contacts", icon: Users, label: "Kontak" },
  { href: "/dashboard/deals", icon: Target, label: "Deals" },
  { href: "/dashboard/knowledge", icon: BookOpen, label: "Knowledge Base" },
  { href: "/dashboard/agents", icon: Bot, label: "AI Agents" },
  { href: "/dashboard/workflows", icon: Zap, label: "Workflows" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
];

const BOTTOM_NAV = [
  { href: "/dashboard/channels", icon: Plug2, label: "Channels" },
  { href: "/dashboard/settings", icon: Settings, label: "Pengaturan" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
      setTenant(JSON.parse(localStorage.getItem("tenant") || "{}"));
    } catch { router.push("/login"); }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface)]">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-[68px]" : "w-[240px]"} flex flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface)] transition-all duration-200 ease-out`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border-subtle)] shrink-0 overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">L</div>
            {!collapsed && <span className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">LeadsAI</span>}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
                  active
                    ? "bg-brand-600/10 text-brand-400 font-medium"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
                }`}
              >
                <item.icon size={18} strokeWidth={1.5} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Nav */}
        <div className="border-t border-[var(--color-border-subtle)] py-3 px-2.5 space-y-0.5">
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  active ? "bg-brand-600/10 text-brand-400 font-medium" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
                }`}
              >
                <item.icon size={18} strokeWidth={1.5} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* User */}
        <div className="border-t border-[var(--color-border-subtle)] p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-semibold text-xs shrink-0">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{user?.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{tenant?.name}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout} className="text-[var(--color-text-muted)] hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-all" title="Logout">
                <LogOut size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
