"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Waves, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles,
  Loader2
} from "lucide-react";
import SimpleTerrain3D from "@/components/SimpleTerrain3D";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (res?.error) {
      setError("Email atau kata sandi salah. Pastikan akun terdaftar.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50 selection:bg-teal-500 selection:text-white">
      {/* 1. Canvas Latar Belakang 3D */}
      <div className="absolute inset-0 z-0">
        <SimpleTerrain3D />
      </div>

      {/* 2. Overlay Gradient (Keterbacaan Konten) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-slate-900/20 to-teal-950/30 backdrop-blur-[2px] z-10 pointer-events-none" />

      {/* 3. Navigasi Kembali ke Beranda */}
      <nav className="absolute top-6 left-6 z-30">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 hover:bg-white border border-teal-100/80 text-xs font-semibold text-slate-700 hover:text-teal-700 shadow-lg shadow-slate-900/5 backdrop-blur-md transition-all group"
        >
          <ArrowLeft className="w-4 h-4 text-teal-600 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </Link>
      </nav>

      {/* 4. Kartu Form Login Glassmorphism */}
      <main className="relative z-20 w-full max-w-md px-4 py-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 p-8 shadow-2xl shadow-teal-950/15 space-y-6">
          
          {/* Header Login (Sempurna di Tengah) */}
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            {/* Ikon Waves */}
            <div className="p-3 bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-2xl shadow-inner">
              <Waves className="w-8 h-8 text-teal-600" />
            </div>
            
            {/* Badge Status */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-[11px] font-semibold text-teal-800">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
              <span>Sistem Control & Command</span>
            </div>

            {/* Judul & Sub-judul */}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Masuk ke SIRENA
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Sistem Retensi & Notifikasi Adaptif • Krueng Tamiang
              </p>
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-teal-600" />
                <input
                  type="email"
                  required
                  placeholder="admin@sirena.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/60 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-teal-600" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/60 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Pesan Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-600 text-center font-semibold">
                {error}
              </div>
            )}

            {/* Tombol Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl text-sm shadow-xl shadow-teal-600/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Card */}
          <div className="pt-4 border-t border-slate-200/60 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Autentikasi Aman SIRENA v0.2</span>
          </div>
        </div>
      </main>
    </div>
  );
}