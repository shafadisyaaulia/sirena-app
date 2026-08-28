import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Proteksi Rute Aplikasi (Dashboard, Pintu Air, Notifikasi, ESG).
     * Rute Publik seperti "/" (Landing Page) dan "/login" TIDAK dimasukkan di sini
     * agar bisa diakses oleh siapa saja tanpa ter-redirect.
     */
    "/dashboard/:path*",
    "/pintu-air/:path*",
    "/notifikasi/:path*",
    "/esg/:path*",
  ],
};