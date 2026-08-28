"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/Sidebar";
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Mail, 
  User, 
  Lock, 
  RefreshCw 
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "BPBD";
  createdAt: string;
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menambah user");
      }

      setFormData({ name: "", email: "", password: "", role: "OPERATOR" });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      alert("Gagal menghapus pengguna");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "OPERATOR":
        return "bg-teal-100 text-teal-700 border-teal-200";
      case "BPBD":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 1. Sidebar Navigasi */}
      <Sidebar />

      {/* 2. Konten Utama Halaman */}
      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h1>
            <p className="text-sm text-slate-500">
              Kelola hak akses dan akun pengguna SIRENA (Admin, Operator, BPBD)
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Muat Ulang Data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Tambah User */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <UserPlus className="text-teal-600" size={20} />
              <h2 className="font-semibold text-slate-800">Tambah Akun Baru</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="operator@sirena.app"
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Role / Peran
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                >
                  <option value="OPERATOR">OPERATOR (Pintu Air & Digital Twin)</option>
                  <option value="BPBD">BPBD (Pemantauan EWS & Evakuasi)</option>
                  <option value="ADMIN">ADMIN (Kontrol Penuh Sistem)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-teal-100 disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Buat Akun"}
              </button>
            </form>
          </div>

          {/* Tabel Daftar User */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Daftar Pengguna Terdaftar</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Pengguna</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Dibuat Pada</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          <ShieldCheck size={12} />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {u.email !== session?.user?.email && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus User"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}