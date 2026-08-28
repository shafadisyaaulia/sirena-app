import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildEsgCsv, buildEsgPdf } from "@/lib/esg/export";
import { EsgMetricSnapshot } from "@prisma/client";

/**
 * ESG-5: ekspor laporan PDF/CSV untuk periode tertentu.
 * Contoh: GET /api/esg/export?from=2026-01-01&to=2026-01-31&format=pdf
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = (searchParams.get("format") ?? "pdf") as "pdf" | "csv";

  // Penambahan tipe eksplisit EsgMetricSnapshot[] untuk mencegah error TypeScript
  let snapshots: EsgMetricSnapshot[] = [];

  // 1. Ambil snapshot berdasarkan rentang tanggal jika parameter diisi
  if (from && to) {
    snapshots = await prisma.esgMetricSnapshot.findMany({
      where: {
        periodStart: { gte: new Date(from) },
        periodEnd: { lte: new Date(to) },
      },
      orderBy: { periodStart: "asc" },
    });
  }

  // 2. Fallback: Jika parameter tidak diisi atau hasil pencarian tanggal kosong,
  // ambil seluruh snapshot yang ada di database (maksimal 50 record terbaru)
  if (snapshots.length === 0) {
    snapshots = await prisma.esgMetricSnapshot.findMany({
      orderBy: { periodStart: "asc" },
      take: 50,
    });
  }

  const filenameDate = from && to ? `${from}-${to}` : "latest";

  // 3. Ekspor format CSV
  if (format === "csv") {
    const csv = buildEsgCsv(snapshots);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sirena-esg-${filenameDate}.csv"`,
      },
    });
  }

  // 4. Ekspor format PDF
  const pdfBuffer = buildEsgPdf(snapshots);
  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sirena-esg-${filenameDate}.pdf"`,
    },
  });
}