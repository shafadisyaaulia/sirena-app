"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Bell, 
  Waves, 
  LineChart, 
  Cpu, 
  LogOut, 
  User, 
  ShieldCheck, 
  ChevronRight 
} from "lucide-react";

// Tipe item navigasi dengan akses role
interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[]; // Jika undefined, berlaku untuk semua role
}

const links: NavLink[] = [
  { href: "/dashboard", label: "Dashboard Utama", icon: LayoutDashboard },
  { href: "/digital-twin", label: "Digital Twin", icon: Cpu, roles: ["ADMIN", "OPERATOR"] },
  { href: "/pintu-air", label: "Pintu Air", icon: Waves, roles: ["ADMIN", "OPERATOR"] },
  { href: "/notifikasi", label: "Notifikasi & Recovery", icon: Bell },
  { href: "/esg", label: "ESG Dashboard", icon: LineChart },
  { href: "/admin/users", label: "Manajemen User", icon: ShieldCheck, roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Ambil role pengguna dari session NextAuth (default STAKEHOLDER/VIEWER jika belum terdaftar)
  const userRole = (session?.user as any)?.role || "VIEWER";
  const userName = session?.user?.name || "Pengguna";
  const userEmail = session?.user?.email || "";

  // Filter menu navigasi berdasarkan role pengguna saat ini
  const filteredLinks = links.filter((link) => {
    if (!link.roles) return true;
    return link.roles.includes(userRole);
  });

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col justify-between shadow-sm">
      {/* 1. Header Sidebar */}
      <div>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="block group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-teal-200">
                S
              </div>
              <div>
                <p className="text-base font-bold text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
                  SIRENA App
                </p>
                <p className="text-[11px] font-medium text-slate-400">Oxbow Krueng Tamiang</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 2. Menu Navigasi */}
        <div className="px-3 py-4">
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Menu Navigasi
          </p>
          <nav className="space-y-1">
            {filteredLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-teal-600 text-white shadow-md shadow-teal-100 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon 
                      size={19} 
                      className={cn(
                        "transition-transform duration-200 group-hover:scale-110",
                        active ? "text-white" : "text-slate-400 group-hover:text-teal-600"
                      )} 
                    />
                    <span>{label}</span>
                  </div>
                  {active && <ChevronRight size={16} className="text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. Footer Sidebar (Profil User & Tombol Logout) */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        {/* Card Profil */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 mb-2 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck size={12} className="text-teal-600 shrink-0" />
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">
                {userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Tombol Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 transition-all duration-200 hover:bg-red-600 hover:text-white hover:shadow-sm group"
        >
          <LogOut size={15} className="transition-transform group-hover:-translate-x-0.5" />
          <span>Keluar dari Aplikasi</span>
        </button>
      </div>
    </aside>
  );
}