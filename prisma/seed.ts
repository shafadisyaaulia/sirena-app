/**
 * Seed data awal — nilai-nilai diambil langsung dari Table 2.1 (Design
 * Specification of SIRENA) pada dokumen Chapter II yang dibagikan tim.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Users (satu akun contoh per peran) ---
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@sirena.app" },
    update: {},
    create: { name: "Admin SIRENA", email: "admin@sirena.app", passwordHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "operator@sirena.app" },
    update: {},
    create: { name: "Operator Kolam", email: "operator@sirena.app", passwordHash, role: "OPERATOR" },
  });
  await prisma.user.upsert({
    where: { email: "bpbd@sirena.app" },
    update: {},
    create: { name: "BPBD Aceh Tamiang", email: "bpbd@sirena.app", passwordHash, role: "BPBD" },
  });

  // --- Parameter Hidrologi Default (Table 2.1) ---
  const existingParamSet = await prisma.hydrologyParameterSet.findFirst({
    where: { name: "Default v1" },
  });
  const parameterSet =
    existingParamSet ??
    (await prisma.hydrologyParameterSet.create({
      data: {
        name: "Default v1",
        isActive: true,
        curveNumberCN: 75, // placeholder — kalibrasi ulang per PRD §13
        alpha: 2,
        tg: 2, // jam, placeholder — kalibrasi ulang
        catchmentAreaKm2: 100, // placeholder — sesuaikan dgn DAS Krueng Tamiang aktual
        riverLengthKm: 25, // placeholder
        stormDurationHr: 6,
        timeStepMin: 10,
        gateCapacityM3s: 200, // Table 2.1: Installed diversion (gate) capacity
        storageCapacityM3: 3_380_000, // Table 2.1: Total design storage capacity
        operationalMaxLevelM: 7.0, // Table 2.1: Operational maximum water level
        emergencyFreeboardM: 1.0, // Table 2.1: Emergency freeboard embankment
        notes:
          "Nilai awal dari Table 2.1 Chapter II. CN, Tg, luas DAS, dan panjang sungai adalah PLACEHOLDER — wajib dikalibrasi ulang (lihat PRD §13 Pertanyaan Terbuka).",
      },
    }));

  // --- Sensor Muka Air (3 titik, sesuai FN-1) ---
  const sensorDefs = [
    { name: "Sensor Hulu Krueng Tamiang", location: "HULU" as const, lat: 4.315, lng: 98.045 },
    { name: "Sensor Hilir Krueng Tamiang", location: "HILIR" as const, lat: 4.298, lng: 98.06 },
    { name: "Sensor Oxbow Karang Baru", location: "OXBOW" as const, lat: 4.30408, lng: 98.05164 }, // ~4°18'14.70"N 98°3'5.90"E
  ];
  for (const s of sensorDefs) {
    const existing = await prisma.waterLevelSensor.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.waterLevelSensor.create({
        data: {
          name: s.name,
          location: s.location,
          latitude: s.lat,
          longitude: s.lng,
          datumElevation: 0,
          criticalLevel: s.location === "OXBOW" ? 7.0 : 8.0, // Table 2.1 operational max / bathymetric range
        },
      });
    }
  }

  // --- Pintu Air (Table 2.1: 3 steel sluice gates, combined width 23.1 m) ---
  const existingGate = await prisma.gate.findFirst({ where: { name: "Intake Sluice Gate KP-02" } });
  if (!existingGate) {
    await prisma.gate.create({
      data: {
        name: "Intake Sluice Gate KP-02",
        type: "SLUICE_INTAKE",
        widthM: 23.1,
        openingHeightM: 2.0,
      },
    });
    await prisma.gate.create({
      data: {
        name: "Flushing Gate",
        type: "FLUSHING",
        widthM: 23.1 * 0.6, // Table 2.1: ~60% of intake width
        openingHeightM: 2.0,
      },
    });
  }

  console.log("Seed selesai. Parameter set aktif:", parameterSet.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
