"use client";

import { useState } from "react";
import { Sliders, Droplets, Clock, HardDrive } from "lucide-react";

export function SimControlPanel() {
  const [rainfall, setRainfall] = useState(28);
  const [duration, setDuration] = useState(3);
  const [soilSat, setSoilSat] = useState(42);

  // Kalkulasi Skor Risiko sederhana
  const riskScore = Math.min(
    100,
    Math.round((rainfall / 200) * 45 + (duration / 24) * 25 + (soilSat / 100) * 30)
  );

  let statusText = "Aman";
  let statusBadgeClass = "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (riskScore > 70) {
    statusText = "Bahaya";
    statusBadgeClass = "bg-red-100 text-red-700 border-red-300";
  } else if (riskScore > 40) {
    statusText = "Waspada";
    statusBadgeClass = "bg-amber-100 text-amber-700 border-amber-300";
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Dynamic Gauge & Status Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Indikator Risiko
          </span>
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusBadgeClass}`}>
            {statusText}
          </span>
        </div>

        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-teal-600 transition-all duration-500 ease-out"
                strokeDasharray={`${riskScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-slate-900">{riskScore}%</span>
              <span className="text-[10px] text-slate-400 font-medium">Index Risiko</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center">
          Dihitung otomatis berdasarkan input parameter hidrologi.
        </div>
      </div>

      {/* Sliders Panel */}
      <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="w-5 h-5 text-teal-600" />
          <h3 className="font-bold text-slate-900 text-sm">Parameter Simulasi Skenario</h3>
        </div>

        <div className="space-y-4">
          {/* Slider 1: Curah Hujan */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Droplets className="w-4 h-4 text-blue-500" /> Curah Hujan Prediksi
              </span>
              <span className="font-bold text-slate-900 font-mono">{rainfall} mm/jam</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={rainfall}
              onChange={(e) => setRainfall(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>

          {/* Slider 2: Durasi Hujan */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Clock className="w-4 h-4 text-amber-500" /> Durasi Hujan
              </span>
              <span className="font-bold text-slate-900 font-mono">{duration} Jam</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>

          {/* Slider 3: Kejenuhan Tanah */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <HardDrive className="w-4 h-4 text-emerald-500" /> Kejenuhan Tanah
              </span>
              <span className="font-bold text-slate-900 font-mono">{soilSat}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={soilSat}
              onChange={(e) => setSoilSat(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}