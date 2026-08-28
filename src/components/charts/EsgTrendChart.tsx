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

interface EsgTrendPoint {
  periode: string;
  leadTime: number;
  utilisasi: number;
  reduksiRisiko: number;
}

export function EsgTrendChart({ data }: { data: EsgTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="leadTime" name="Lead Time (mnt)" stroke="#1e3a5f" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="utilisasi" name="Pemanfaatan (%)" stroke="#1f7a6c" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="reduksiRisiko" name="Reduksi Risiko (%)" stroke="#c05621" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
