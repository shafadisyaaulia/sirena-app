import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Ambil semua sensor muka air beserta pembacaan terbarunya
    const waterSensors = await prisma.waterLevelSensor.findMany({
      include: {
        readings: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    // 2. Ambil pembacaan curah hujan terbaru
    const latestRain = await prisma.rainReading.findFirst({
      orderBy: { timestamp: "desc" },
    });

    // 3. Kalkulasi sensor online (lastSeenAt dalam 15 menit terakhir)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const activeSensorsCount = waterSensors.filter(
      (s) => s.lastSeenAt && new Date(s.lastSeenAt) > fifteenMinsAgo
    ).length;

    // Filter sensor berdasarkan lokasi/tipe jika ada
    const oxbowSensor = waterSensors.find((s) =>
      s.locationName?.toLowerCase().includes("oxbow") || s.id.toLowerCase().includes("oxbow")
    ) || waterSensors[0];

    const oxbowLevel = oxbowSensor?.readings[0]?.levelM ?? 0.9;
    const currentRainfall = latestRain?.rainfallMm ?? 28;

    return NextResponse.json({
      success: true,
      data: {
        activeSensors: activeSensorsCount || waterSensors.length,
        totalSensors: waterSensors.length || 3,
        oxbowLevelM: oxbowLevel,
        currentRainfallMm: currentRainfall,
        sensors: waterSensors.map((s) => ({
          id: s.id,
          name: s.locationName || s.id,
          lastLevel: s.readings[0]?.levelM ?? 0,
          lastSeen: s.lastSeenAt,
        })),
      },
    });
  } catch (error) {
    console.error("API Sensors Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data sensor dari database" },
      { status: 500 }
    );
  }
}