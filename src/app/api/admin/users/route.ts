import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Ambil seluruh daftar pengguna (Khusus ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak. Khusus Admin." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

// POST: Tambah pengguna baru (Khusus ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak. Khusus Admin." }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Semua field wajib diisi." }, { status: 400 });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah digunakan." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat pengguna." }, { status: 500 });
  }
}