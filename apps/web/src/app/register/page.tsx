"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Registrasi gagal");
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      localStorage.setItem("tenant", JSON.stringify(data.data.tenant));
      router.push("/dashboard/inbox");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "companyName", label: "Nama Perusahaan", type: "text", placeholder: "PT. Contoh Indonesia" },
    { key: "name", label: "Nama Lengkap", type: "text", placeholder: "John Doe" },
    { key: "email", label: "Email", type: "email", placeholder: "nama@perusahaan.com" },
    { key: "password", label: "Password", type: "password", placeholder: "Minimal 6 karakter" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-surface)]">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">L</div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Buat Akun LeadsAI</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">500 AI credits gratis · Setup dalam 5 menit</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
          )}
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{f.label}</label>
              <input
                type={f.type} value={(form as any)[f.key]} onChange={(e) => updateField(f.key, e.target.value)} required
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm"
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-600/25 disabled:opacity-50 mt-2"
          >
            {loading ? "Membuat akun..." : "Daftar Sekarang"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
