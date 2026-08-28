"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { 
  Waves, 
  Cpu, 
  BellRing, 
  ArrowRight, 
  Activity, 
  Gauge, 
  CheckCircle2, 
  TrendingUp,
  Droplets,
  Sparkles,
  Server,
  ShieldCheck,
  Radio
} from "lucide-react";
import SimpleTerrain3D from "@/components/SimpleTerrain3D";

export default function LandingPage() {
  const { status } = useSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between overflow-x-hidden selection:bg-teal-500 selection:text-white">
      <div>
        {/* Navbar */}
        <nav className="border-b border-teal-100/60 bg-white/70 backdrop-blur-md fixed w-full z-50 transition-all shadow-xs">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl shadow-xs">
                <Waves className="w-6 h-6 text-teal-600" />
              </div>
              <span className="font-extrabold text-xl tracking-wider text-slate-900">
                SIRENA<span className="text-teal-600">.</span>
              </span>
            </div>
            
            <Link
              href={status === "authenticated" ? "/dashboard" : "/login"}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl hover:shadow-lg hover:shadow-teal-500/20 transition-all flex items-center gap-2 group"
            >
              {status === "authenticated" ? "Buka Dashboard" : "Masuk Aplikasi"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </nav>

        {/* Hero Section dengan Background 3D Seamless */}
        <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden pt-28 pb-16 px-6">
          
          {/* 1. Background 3D Full Width */}
          <div className="absolute inset-0 z-0">
            <SimpleTerrain3D />
          </div>

          {/* 2. Layer Gradient Blend (Menghilangkan kesan terpotong & menjaga keterbacaan teks) */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/70 via-slate-50/30 to-slate-50 z-10 pointer-events-none" />

          {/* 3. Konten Utama Hero */}
          <div className="max-w-4xl mx-auto text-center space-y-6 relative z-20">
            {/* Badge Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-200/80 bg-white/80 backdrop-blur-md text-teal-800 text-xs font-semibold shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
              Sistem Mitigasi Hydro-AI & Retensi Air Tamiang
            </motion.div>

            {/* Headline Utama */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight max-w-4xl mx-auto drop-shadow-xs"
            >
              Sistem Retensi & Notifikasi Adaptif{" "}
              <span className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 bg-clip-text text-transparent">
                Oxbow Krueng Tamiang
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-slate-700 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-2xs"
            >
              Platform terpadu pengoperasian pintu air otomatis, pemodelan hidrologi prediktif, dan peringatan dini bencana banjir di Aceh Tamiang.
            </motion.p>

            {/* Tombol Aksi (CTA) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4 pt-2"
            >
              <Link
                href={status === "authenticated" ? "/dashboard" : "/login"}
                className="px-8 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-teal-600/25 hover:scale-105 active:scale-95 text-sm"
              >
                {status === "authenticated" ? "Buka Panel Dashboard" : "Masuk ke Panel Kontrol"}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            {/* Indicator Tag 3D Live */}
            <div className="pt-6 flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-teal-200/60 text-[11px] font-semibold text-slate-700 shadow-xs">
                <Radio className="w-3.5 h-3.5 text-teal-600 animate-pulse" /> Live 3D Topografi Gunung & Actuating Sluice Gate
              </div>
            </div>
          </div>
        </section>

        {/* Telemetry Control Panel Mockup */}
        <section className="pb-12 px-6 max-w-5xl mx-auto relative z-20 -mt-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-400 font-mono ml-2">sirena-oxbow-telemetry.id</span>
              </div>
              <div className="text-xs text-teal-300 bg-teal-950 border border-teal-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                Status Sensor Aktif
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-400">Muka Air Oxbow</p>
                  <Droplets className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-2xl font-black text-white mt-2">6.85 <span className="text-xs font-normal text-slate-400">m</span></p>
                <p className="text-[10px] text-teal-400 mt-1 font-medium">Status Normal (&lt; 7.00 m)</p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-400">Bukaan Sluice Gate</p>
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white mt-2">85 <span className="text-xs font-normal text-slate-400">%</span></p>
                <span className="inline-block mt-2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                  Aktuasi Otomatis
                </span>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-400">Reduksi Debit</p>
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-2xl font-black text-teal-400 mt-2">-14.6%</p>
                <p className="text-[10px] text-slate-400 mt-1">1.013,5 → 866,0 m³/s</p>
              </div>
            </div>
          </div>
        </section>

        {/* Metrik Grid */}
        <section className="py-12 px-6 bg-white border-y border-teal-100 shadow-xs">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Tampungan Oxbow" value="3,38 Juta m³" desc="Kapasitas Retensi Total" />
            <StatCard title="Kapasitas Intake" value="200 m³/s" desc="3 Sluice Gate KP-02" />
            <StatCard title="Reduksi Debit Banjir" value="~14,6%" desc="1.013,5 → 866,0 m³/s" />
            <StatCard title="Titik Pemantauan" value="3 Sensor" desc="Hulu, Hilir, & Basin" />
          </div>
        </section>

        {/* Modul Utama */}
        <section className="py-20 px-6 max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-bold text-teal-700 tracking-wider uppercase bg-teal-100 border border-teal-200 px-3 py-1 rounded-full">
              Fitur Utama
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Modul Utama SIRENA</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              Integrasi presisi tinggi antara jaringan fisik kolam retensi dan pemodelan prediktif.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Cpu className="w-6 h-6 text-teal-600" />}
              title="Pemodelan Hidrologi"
              desc="Simulasi banjir real-time dengan rantai pemodelan hidrologi Thiessen, Mononobe, SCS-CN, dan Reservoir Routing."
            />
            <FeatureCard
              icon={<BellRing className="w-6 h-6 text-emerald-600" />}
              title="Notifikasi Multi-Kanal"
              desc="Penyebaran peringatan dini otomatis via WhatsApp Gateway, USSD Emergency, dan Dasbor SIRENA."
            />
            <FeatureCard
              icon={<Gauge className="w-6 h-6 text-teal-600" />}
              title="ESG & Recovery Support"
              desc="Laporan dampak lingkungan terukur, pelacak resiliensi ekosistem, serta penandaan otomatis untuk BPBD."
            />
          </div>
        </section>

        {/* Keunggulan System */}
        <section className="pb-20 px-6 max-w-5xl mx-auto">
          <div className="bg-white border border-teal-100 rounded-3xl p-8 md:p-12 shadow-xl shadow-teal-900/5 relative overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 text-[11px] font-bold bg-teal-100 border border-teal-200 text-teal-700 rounded-full inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Keunggulan Sistem
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
                  Mitigasi Banjir Berbasis Prediksi Real-Time
                </h2>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                  SIRENA menggabungkan sensor IoT lapangan dengan algoritma hidrologi untuk menghitung kapasitas retensi Oxbow Karang Baru secara presisi.
                </p>
              </div>

              <div className="space-y-3.5">
                <CheckItem text="Integrasi Sensor Telemetri Muka Air (Hulu, Hilir, Basin)" />
                <CheckItem text="Perhitungan Otomatis Waktu Puncak (Time to Peak) Banjir" />
                <CheckItem text="Rekomendasi Operasional Pintu Intake Sluice Gate KP-02" />
                <CheckItem text="Evaluasi Tingkat Bahaya Alert / Warning Status Terotomatisasi" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Bottom Banner */}
        <section className="pb-24 px-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-8 md:p-12 text-center text-white space-y-5 shadow-2xl shadow-teal-600/20">
            <h2 className="text-3xl md:text-4xl font-black">Siap Mengelola Retensi Air Oxbow?</h2>
            <p className="text-xs md:text-sm text-teal-50 max-w-xl mx-auto font-medium">
              Akses panel kontrol utama untuk memantau status sensor real-time dan menjalankan simulasi hidrologi terbaru.
            </p>
            <div className="pt-2">
              <Link
                href={status === "authenticated" ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-teal-800 font-extrabold text-sm rounded-xl hover:bg-teal-50 transition-all shadow-lg"
              >
                {status === "authenticated" ? "Buka Dashboard Sekarang" : "Masuk ke Panel Kontrol"}
                <ArrowRight className="w-4 h-4 text-teal-600" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        SIRENA App &copy; 2026 — Kec. Karang Baru, Kab. Aceh Tamiang.
      </footer>
    </div>
  );
}

function StatCard({ title, value, desc }: { title: string; value: string; desc: string }) {
  return (
    <div className="p-5 rounded-2xl bg-teal-50/40 border border-teal-100 text-center hover:border-teal-300 transition-colors">
      <p className="text-xs text-slate-500 font-medium">{title}</p>
      <p className="text-xl md:text-2xl font-black text-teal-700 my-1">{value}</p>
      <p className="text-[11px] text-slate-400">{desc}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-500/5 transition-all group">
      <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
      <span className="text-xs md:text-sm font-semibold text-slate-700">{text}</span>
    </div>
  );
}