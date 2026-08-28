"use client";

import { useState } from "react";

export function SendNotificationForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("WASPADA");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, severity }),
      });
      setTitle("");
      setMessage("");
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Judul Peringatan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="border border-slate-200 rounded-lg p-2 text-sm focus:outline-teal-500"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="border border-slate-200 rounded-lg p-2 text-sm focus:outline-teal-500 bg-white"
        >
          <option value="NORMAL">NORMAL</option>
          <option value="WASPADA">WASPADA</option>
          <option value="SIAGA">SIAGA</option>
          <option value="AWAS">AWAS</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-sirena-navy hover:bg-slate-800 text-white font-medium text-sm rounded-lg py-2 px-4 transition-all disabled:opacity-50"
        >
          {loading ? "Mengirim..." : "Kirim Broadcast Multi-Kanal"}
        </button>
      </div>
      <textarea
        placeholder="Isi pesan peringatan dini..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        rows={2}
        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-teal-500"
      />
    </form>
  );
}