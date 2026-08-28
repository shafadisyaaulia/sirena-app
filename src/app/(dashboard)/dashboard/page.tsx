"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Clock,
  Cpu,
  Droplets,
  HardDrive,
  Layers,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Waves,
} from "lucide-react";

interface SensorApiData {
  activeSensors: number;
  totalSensors: number;
  oxbowLevelM: number;
  currentRainfallMm: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();

  // State Telemetri Database
  const [sensorData, setSensorData] = useState<SensorApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State Simulasi Hidrologi Interactive
  const [rainfall, setRainfall] = useState(28);
  const [duration, setDuration] = useState(3);
  const [soilSat, setSoilSat] = useState(42);

  // Fetch Data Telemetri dari /api/sensors
  const loadSensorData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/sensors");
      const json = await res.json();
      if (json.success && json.data) {
        setSensorData(json.data);
        if (json.data.currentRainfallMm !== undefined) {
          setRainfall(json.data.currentRainfallMm);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data sensor:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSensorData();
  }, [loadSensorData]);

  // Kalkulasi Skor Risiko Dinamis
  const riskScore = Math.min(
    100,
    Math.round((rainfall / 150) * 45 + (duration / 24) * 25 + (soilSat / 100) * 30)
  );

  let statusText = "Aman / Normal";
  let statusBadgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
  let statusBgGradient = "from-emerald-500 to-teal-600";

  if (riskScore > 75) {
    statusText = "BAHAYA / BANJIR";
    statusBadgeClass = "bg-rose-100 text-rose-900 border-rose-300 font-extrabold";
    statusBgGradient = "from-red-500 to-rose-600";
  } else if (riskScore > 45) {
    statusText = "WASPADA / SIAGA";
    statusBadgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-extrabold";
    statusBgGradient = "from-amber-500 to-orange-600";
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-6 md:p-10 space-y-8 font-sans">
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-teal-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-300 text-teal-800 text-sm font-bold">
              Live Monitoring System
            </span>
            <span className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-slate-600 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              Sistem Aktif
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Utama SIRENA
          </h1>
          <p className="text-sm md:text-base text-slate-700 font-medium mt-1">
            Selamat datang{session?.user?.name ? `, ${session.user.name}` : ""}. Pantau resiliensi retensi Oxbow Krueng Tamiang secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadSensorData}
            disabled={isRefreshing}
            className="p-3 rounded-2xl border border-teal-200 hover:bg-teal-50 text-slate-700 transition-all flex items-center gap-2 font-bold text-sm"
            title="Refresh Data Sensor"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin text-teal-600" : ""}`} />
            <span>Perbarui Data</span>
          </button>
          <div className="h-10 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">LOKASI KONTROL</p>
            <p className="text-sm font-extrabold text-slate-800">Karang Baru, Aceh Tamiang</p>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatWidget
          title="Muka Air Oxbow"
          value={loading ? "..." : `${sensorData?.oxbowLevelM ?? 0.9} m`}
          sub="Kapasitas Retensi Maksimal"
          icon={<Layers className="w-6 h-6 text-teal-600" />}
          trend="+0.2% Vol"
          trendUp={true}
        />
        <StatWidget
          title="Kapasitas Intake"
          value="200 m³/s"
          sub="3 Sluice Gate KP-02"
          icon={<Waves className="w-6 h-6 text-blue-600" />}
          badge="Nominal"
        />
        <StatWidget
          title="Reduksi Banjir"
          value="~14,6%"
          sub="1.013,5 → 866,0 m³/s"
          icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
          trend="Efektif"
          trendUp={true}
        />
        <StatWidget
          title="Status Sensor Telemetri"
          value={
            loading
              ? "..."
              : `${sensorData?.activeSensors ?? 0} / ${sensorData?.totalSensors ?? 3} Online`
          }
          sub="Hulu, Hilir, & Basin"
          icon={<Radio className="w-6 h-6 text-amber-600" />}
          badge="Terhubung"
        />
      </div>

      {/* Main Interactive Grid: Risk Gauge & Hydrology Model Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Assessment & Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 md:p-8 rounded-3xl border border-teal-200 shadow-sm flex flex-col justify-between space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-teal-600" />
              <h2 className="font-bold text-slate-900 text-base md:text-lg">Status Assessment Risiko</h2>
            </div>
            <span className={`px-3.5 py-1.5 text-xs md:text-sm font-extrabold rounded-full border ${statusBadgeClass}`}>
              {statusText}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center my-2">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`bg-gradient-to-r ${statusBgGradient} transition-all duration-700 ease-out`}
                  strokeDasharray={`${riskScore}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-black text-slate-900">{riskScore}%</span>
                <span className="text-xs text-slate-500 font-bold tracking-wider uppercase mt-1">
                  Indeks Bahaya
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 text-sm text-slate-700 space-y-1.5">
            <div className="flex justify-between text-slate-900 font-bold text-sm">
              <span>Estimasi Waktu Puncak (Peak):</span>
              <span className="font-mono text-teal-800">~2.4 Jam</span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
              Kalkulasi dinamis memadukan variabel curah hujan prediksi, durasi presipitasi, dan rasio kejenuhan tanah.
            </p>
          </div>
        </motion.div>

        {/* Parametric Interactive Simulation Controls */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-teal-200 shadow-sm flex flex-col justify-between space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Sliders className="w-6 h-6 text-teal-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-base md:text-lg">Simulasi Parameter Skenario</h2>
                <p className="text-xs md:text-sm text-slate-600 font-medium">Atur parameter hidrologi untuk memodelkan debit banjir</p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono bg-teal-50 text-teal-800 px-3 py-1.5 rounded-xl border border-teal-200">
              Interactive Mode
            </span>
          </div>

          <div className="space-y-6">
            {/* Slider 1: Curah Hujan */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-800">
                  <Droplets className="w-5 h-5 text-blue-500" /> Curah Hujan Prediksi
                </span>
                <span className="font-black text-slate-900 font-mono text-base bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {rainfall} mm/jam
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
                className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>Rendah (0 mm)</span>
                <span>Sedang (50 mm)</span>
                <span>Ekstrem (150 mm)</span>
              </div>
            </div>

            {/* Slider 2: Durasi Hujan */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-800">
                  <Clock className="w-5 h-5 text-amber-500" /> Durasi Presipitasi
                </span>
                <span className="font-black text-slate-900 font-mono text-base bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {duration} Jam
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>1 Jam</span>
                <span>12 Jam</span>
                <span>24 Jam</span>
              </div>
            </div>

            {/* Slider 3: Kejenuhan Tanah */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-800">
                  <HardDrive className="w-5 h-5 text-emerald-500" /> Kejenuhan Tanah (SCS-CN)
                </span>
                <span className="font-black text-slate-900 font-mono text-base bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {soilSat}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={soilSat}
                onChange={(e) => setSoilSat(Number(e.target.value))}
                className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>Kering (0%)</span>
                <span>Lembap (50%)</span>
                <span>Jenuh Total (100%)</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hydrologic Chain & Module Shortcut Bar */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-teal-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-extrabold text-slate-900 flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-teal-600" /> Alur Rantai Hidrologi Adaptif (Engine SIRENA)
          </h2>
          <span className="text-xs md:text-sm text-slate-600 font-bold hidden sm:inline">5 Tahapan Pemodelan Aktif</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <ChainStep number="01" title="Thiessen Polygon" desc="Interpolasi Hujan" />
          <ChainStep number="02" title="Mononobe / ABM" desc="Intensitas Jam-jaman" />
          <ChainStep number="03" title="SCS-CN Model" desc="Hujan Efektif" />
          <ChainStep number="04" title="Nakayasu HSS" desc="Hidrograf Satuan" />
          <ChainStep number="05" title="Reservoir Routing" desc="Simulasi Gate Storage" />
        </div>
      </div>
    </div>
  );
}

// Sub-komponen UI
function StatWidget({
  title,
  value,
  sub,
  icon,
  trend,
  trendUp,
  badge,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  badge?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm flex flex-col justify-between space-y-4"
    >
      <div className="flex items-start justify-between">
        <div className="p-3 bg-teal-50 border border-teal-100 rounded-2xl">{icon}</div>
        {trend && (
          <span
            className={`text-xs font-extrabold px-2.5 py-1 rounded-full flex items-center gap-0.5 ${
              trendUp ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"
            }`}
          >
            {trend} {trendUp && <ArrowUpRight className="w-3.5 h-3.5" />}
          </span>
        )}
        {badge && (
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
            {badge}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs md:text-sm text-slate-600 font-bold">{title}</p>
        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight my-1">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{sub}</p>
      </div>
    </motion.div>
  );
}

function ChainStep({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100 text-left space-y-1 hover:border-teal-300 transition-colors">
      <span className="text-xs font-black text-teal-700 block">{number}</span>
      <h3 className="text-xs md:text-sm font-bold text-slate-900 leading-tight">{title}</h3>
      <p className="text-xs text-slate-600 font-medium">{desc}</p>
    </div>
  );
}