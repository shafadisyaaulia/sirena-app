import "./globals.css";
import Providers from "@/components/Providers";
import { Sidebar } from "@/components/Sidebar"; // Import komponen Sidebar

export const metadata = {
  title: "SIRENA App",
  description: "Sistem Retensi & Notifikasi Adaptif Oxbow Krueng Tamiang",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <div className="flex min-h-screen">
            {/* Sidebar Komponen Utama */}
            <Sidebar />

            {/* Container Konten Utama */}
            {/* pt-16 memberi ruang untuk Mobile Topbar (64px) di HP, md:pt-0 meresetnya di Desktop */}
            <main className="flex-1 w-full min-w-0 pt-16 md:pt-0">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}