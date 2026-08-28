import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE: Hapus pengguna
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Pengguna berhasil dihapus." });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus pengguna." }, { status: 500 });
  }
}