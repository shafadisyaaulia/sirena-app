"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface HydrographPointDto {
  tMinutes: number;
  inflowM3s: number;
  outflowM3s: number | null;
}

/** DT-5/DT-7: memvisualisasikan hidrograf debit masuk vs debit keluar terkendali. */
export function HydrographChart({ points }: { points: HydrographPointDto[] }) {
  const data = points.map((p) => ({
    waktu: `${p.tMinutes}m`,
    "Debit Masuk (Inflow)": Number(p.inflowM3s.toFixed(1)),
    "Debit Keluar Terkendali (Outflow)": p.outflowM3s != null ? Number(p.outflowM3s.toFixed(1)) : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="waktu" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} label={{ value: "m³/s", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Debit Masuk (Inflow)" stroke="#c05621" strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="Debit Keluar Terkendali (Outflow)"
          stroke="#1f7a6c"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
