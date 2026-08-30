import "./globals.css";
import Providers from "@/components/Providers"; // Sesuaikan path jika disimpan di tempat lain

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}