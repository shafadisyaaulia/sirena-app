# SIRENA App — Panduan Instalasi & Pengembangan Lengkap

Lapisan digital untuk **Sistem Retensi dan Notifikasi Adaptif (SIRENA)** —
Oxbow Krueng Tamiang, Kec. Karang Baru, Kab. Aceh Tamiang. Dibangun sesuai
`SIRENA_App_PRD_v2_ID.md` (Digital Twin, Flood Notification, Aktuasi Pintu
Air Otomatis, Recovery Support, ESG Dashboard).

**Stack:** Next.js 14 (App Router, TypeScript) · PostgreSQL + Prisma ORM ·
NextAuth (kredensial + role) · Tailwind CSS · Recharts · node-cron (worker
terjadwal) · Twilio (WhatsApp) · jsPDF (ekspor laporan ESG).

---

## 1. Mengapa stack ini?

| Kebutuhan PRD | Pilihan Teknologi | Alasan |
|---|---|---|
| Full-stack satu bahasa (FE+BE) | **Next.js App Router** | API routes (`src/app/api/**`) + halaman React di satu proyek, cocok untuk tim kecil. |
| Data time-series (sensor, hujan) + relasional (aktuasi, notifikasi, ESG) | **PostgreSQL** | Mendukung keduanya; disarankan tambah ekstensi **TimescaleDB** untuk tabel `RainReading`, `WaterLevelReading`, `HydrographPoint` agar query rentang waktu tetap cepat saat data bertambah besar. |
| Skema dapat berevolusi + query type-safe | **Prisma ORM** | Migrasi terkelola, auto-complete, cocok untuk skema PRD yang kompleks (6 modul). |
| Konfigurabilitas parameter hidrologi tanpa rilis kode (DT-9) | Tabel `HydrologyParameterSet` di DB, bukan file config statis | Operator dapat menambah parameter set baru & mengaktifkannya lewat UI/DB tanpa deploy ulang. |
| Job terjadwal (siklus sensing→prediction tiap N menit) | **node-cron** di proses worker terpisah | Next.js API routes bersifat request-scoped; scheduler jangka panjang perlu proses long-running sendiri. |
| Kanal WhatsApp & USSD (FN-6) | Adapter terpisah (`lib/notifications/whatsapp.ts`, `ussd.ts`) | Provider mudah diganti tanpa menyentuh logika dispatch. |

---

## 2. Struktur Proyek

```
sirena-app/
├── prisma/
│   ├── schema.prisma        # Skema DB — semua modul PRD
│   └── seed.ts               # Data awal dari Table 2.1
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Rute terproteksi (butuh login)
│   │   │   ├── layout.tsx     # Sidebar
│   │   │   ├── page.tsx       # Digital Twin (beranda)
│   │   │   ├── pintu-air/     # Kendali pintu (GA-1..GA-4)
│   │   │   ├── notifikasi/    # FN + RT (Recovery Support)
│   │   │   └── esg/           # ESG Dashboard
│   │   ├── login/             # Halaman login publik
│   │   └── api/                # Semua endpoint backend
│   │       ├── auth/[...nextauth]/
│   │       ├── sensors/ingest/     # FN-1: terima data sensor lapangan
│   │       ├── twin/run/           # Jalankan Digital Twin
│   │       ├── gates/actuate/      # GA-1..GA-4
│   │       ├── notifications/send/ # FN-6/FN-7
│   │       ├── recovery-flags/     # RT-1..RT-3
│   │       └── esg/export|generate-snapshot/  # ESG-1..ESG-5
│   ├── components/            # UI + form + chart
│   ├── lib/
│   │   ├── hydrology/          # ** Inti Digital Twin **
│   │   │   ├── thiessen.ts
│   │   │   ├── mononobeAbm.ts
│   │   │   ├── scsCurveNumber.ts
│   │   │   ├── nakayasu.ts
│   │   │   ├── reservoirRouting.ts
│   │   │   └── digitalTwin.ts  # orkestrator
│   │   ├── notifications/      # dispatcher + adapter WA/USSD + threshold
│   │   ├── esg/                 # agregasi + ekspor PDF/CSV
│   │   ├── auth.ts, prisma.ts, audit.ts, utils.ts
│   └── workers/                 # Proses cron terpisah
│       ├── twinWorker.ts        # jalankan Digital Twin berkala
│       └── ingestWorker.ts      # polling BMKG/satelit
├── .env.example
├── package.json
└── tailwind.config.ts / tsconfig.json / next.config.js
```

---

## 3. Langkah Instalasi (dari Nol)

### 3.1 Prasyarat
- Node.js ≥ 18.18
- PostgreSQL ≥ 14 (lokal, Docker, atau layanan terkelola seperti Neon/Supabase)
- (Opsional tapi disarankan) ekstensi **TimescaleDB** aktif di database

### 3.2 Kloning kode ke proyek Anda
Salin seluruh isi folder `sirena-app/` yang dihasilkan ke repo Anda, lalu:

```bash
cd sirena-app
npm install
```

### 3.3 Konfigurasi environment

```bash
cp .env.example .env
```

Isi minimal untuk mulai development:
- `DATABASE_URL` → koneksi Postgres Anda
- `NEXTAUTH_SECRET` → hasil `openssl rand -base64 32`
- `SENSOR_INGEST_TOKEN` → token acak untuk endpoint ingest sensor

Kredensial WhatsApp/USSD/BMKG/satelit **boleh dikosongkan dulu** — sistem
tetap berjalan (Digital Twin, dashboard, kendali pintu manual), hanya
pengiriman WhatsApp/USSD/polling otomatis yang akan gagal dengan pesan error
yang jelas sampai kredensial diisi.

### 3.4 Setup database

```bash
# Membuat semua tabel sesuai schema.prisma
npm run db:push

# (Alternatif untuk histori migrasi yang tervesionkan)
npm run db:migrate

# Isi data awal: user contoh, parameter hidrologi default (Table 2.1),
# 3 sensor muka air, 2 pintu air
npm run db:seed
```

Login contoh setelah seed (**segera ganti kata sandi di produksi**):
| Role | Email | Password |
|---|---|---|
| ADMIN | admin@sirena.app | ChangeMe123! |
| OPERATOR | operator@sirena.app | ChangeMe123! |
| BPBD | bpbd@sirena.app | ChangeMe123! |

### 3.5 Jalankan aplikasi web

```bash
npm run dev
```

Buka `http://localhost:3000` → akan diarahkan ke `/login`.

### 3.6 Jalankan worker (proses terpisah, wajib untuk siklus otomatis)

Buka terminal baru untuk masing-masing:

```bash
npm run worker:twin     # Menjalankan Digital Twin tiap 10 menit (bisa diubah via TWIN_CRON_SCHEDULE)
npm run worker:ingest   # Polling BMKG/satelit tiap 5 menit
```

> Di produksi, jalankan kedua worker ini sebagai proses long-running
> terpisah (PM2, systemd service, atau container terpisah) — **bukan**
> sebagai bagian dari proses `next start`.

### 3.7 Mengirim data sensor lapangan (uji coba manual)

Gunakan token dari `SENSOR_INGEST_TOKEN`:

```bash
curl -X POST http://localhost:3000/api/sensors/ingest \
  -H "Content-Type: application/json" \
  -H "X-Sensor-Token: <SENSOR_INGEST_TOKEN>" \
  -d '{
    "type": "water_level",
    "sensorId": "<id sensor dari Prisma Studio>",
    "timestamp": "2026-08-27T10:00:00Z",
    "levelM": 5.2
  }'
```

Lihat/salin `sensorId` via `npm run db:studio` (membuka Prisma Studio, GUI
untuk melihat & mengedit isi database).

### 3.8 Menjalankan simulasi Digital Twin pertama

1. Login sebagai `operator@sirena.app`.
2. Di halaman **Digital Twin**, klik **"Jalankan Simulasi Digital Twin"**.
3. Hasil (debit puncak, waktu puncak, hidrograf, strategi pengalihan) akan
   tampil setelah proses selesai (biasanya < 1 detik untuk skala data ini).

> **Penting:** nilai `curveNumberCN`, `tg`, `catchmentAreaKm2`, dan
> `riverLengthKm` di `HydrologyParameterSet` hasil seed adalah **placeholder**.
> Ganti dengan hasil analisis hidrologi aktual dari Chapter II sebelum
> dipakai untuk pengambilan keputusan nyata (lihat PRD §13 Pertanyaan
> Terbuka dan §10 Asumsi & Ketergantungan).

---

## 4. Peta Kebutuhan PRD → Kode

| ID PRD | Lokasi Implementasi |
|---|---|
| DT-1 (Thiessen) | `src/lib/hydrology/thiessen.ts` |
| DT-2 (fallback satelit) | `src/workers/ingestWorker.ts` + `computeArealRainfallThiessen` |
| DT-3 (Mononobe+ABM) | `src/lib/hydrology/mononobeAbm.ts` |
| DT-4 (SCS-CN) | `src/lib/hydrology/scsCurveNumber.ts` |
| DT-5 (Nakayasu) | `src/lib/hydrology/nakayasu.ts` |
| DT-6/DT-7 (routing & strategi) | `src/lib/hydrology/reservoirRouting.ts` |
| DT-8 (audit run) | Tabel `DigitalTwinRun` + `HydrographPoint`, `writeAuditLog` |
| DT-9 (kalibrasi tanpa rilis kode) | Tabel `HydrologyParameterSet` (multi-row, `isActive`) |
| FN-1..FN-5 | `src/app/api/sensors/ingest`, model `WaterLevelSensor/Reading` |
| FN-6 (multi-kanal) | `src/lib/notifications/dispatcher.ts`, `whatsapp.ts`, `ussd.ts` |
| FN-7 (status per kanal) | Model `NotificationDelivery` |
| GA-1..GA-4 | `src/app/api/gates/actuate`, `GateControlPanel.tsx` |
| RT-1..RT-3 | Model `RecoveryFlag`, `src/app/api/recovery-flags`, dipicu dari `digitalTwin.ts` saat status AWAS |
| ESG-1..ESG-5 | `src/lib/esg/aggregate.ts`, `export.ts`, halaman `/esg` |
| Auditabilitas (§9) | Model `AuditLog`, dipanggil di setiap aksi penting |
| Konfigurabilitas (§9) | `HydrologyParameterSet` — ubah via Prisma Studio atau (kembangkan) halaman Admin |

---

## 5. Yang Perlu Anda Sesuaikan Sebelum Produksi

1. **Parameter hidrologi aktual** — ganti placeholder `catchmentAreaKm2`,
   `riverLengthKm`, `tg`, `curveNumberCN` di `prisma/seed.ts` dengan hasil
   Chapter II.
2. **Endpoint BMKG & satelit** — `fetchBmkgReading`/`fetchSatelliteReading`
   di `src/workers/ingestWorker.ts` memakai struktur URL contoh; sesuaikan
   dengan kontrak API resmi yang dipakai tim.
3. **Provider WhatsApp** — `src/lib/notifications/whatsapp.ts` memakai
   Twilio sebagai contoh; ganti ke WhatsApp Business API resmi bila sudah
   dikontrak (PRD §10).
4. **Gateway USSD** — `src/lib/notifications/ussd.ts` perlu disesuaikan
   dengan spesifikasi provider lokal yang dipilih.
5. **Integrasi PDAM/irigasi** — `cleanWaterSuppliedM3`/`irrigationWaterSuppliedM3`
   di `src/lib/esg/aggregate.ts` masih placeholder (0); tambahkan model
   `WaterOfftakeLog` + sumber datanya saat integrasi PDAM tersedia.
6. **Kurva elevasi–storage kolam** — `estimateStorageFromLevel` di
   `digitalTwin.ts` memakai interpolasi linear sederhana; ganti dengan
   kurva hasil survei batimetri (Chosyi, 2025) bila tersedia per elevasi.
7. **Halaman Admin** untuk mengelola `HydrologyParameterSet`, `RainGauge`,
   `ThiessenPolygon`, dan `Household` (saat ini dikelola via Prisma Studio
   — cukup untuk MVP, tapi sebaiknya punya UI khusus untuk operator non-teknis).
8. **Endpoint AUTO gate actuation** — saat ini dilindungi token layanan
   sederhana (`SENSOR_INGEST_TOKEN`); pertimbangkan token khusus terpisah
   dan/atau mTLS sebelum operasi otonom penuh diaktifkan (roadmap Tahap 6).
9. **Rate limiting & validasi tambahan** pada endpoint publik-facing
   (`/api/sensors/ingest`) untuk mencegah penyalahgunaan.

---

## 6. Deploy

- **Aplikasi web (Next.js):** Vercel, atau container Docker (`next build` +
  `next start`) di VM/Kubernetes.
- **Worker (`worker:twin`, `worker:ingest`):** proses Node long-running
  terpisah — cocok di VM kecil, container terjadwal, atau service seperti
  Railway/Render "Background Worker". **Jangan** deploy sebagai serverless
  function karena node-cron butuh proses yang tetap hidup.
- **Database:** PostgreSQL terkelola dengan ekstensi TimescaleDB (mis. Timescale
  Cloud) atau self-hosted; pastikan backup terjadwal karena data ini dipakai
  untuk audit & pelaporan ESG.

---

## 7. Lisensi Data & Sumber

Nilai desain (kapasitas kolam ≈3,38 juta m³, kapasitas pintu ≈200 m³/s,
lebar intake 23,1 m, dst.) diambil langsung dari **Table 2.1** pada
`SIRENA_Tables_2.1_3.1_3.2.docx` yang dibagikan tim, dan dipakai sebagai
nilai seed awal (`prisma/seed.ts`). Selalu verifikasi ulang terhadap draf
Chapter II–III terbaru sebelum dipakai untuk keputusan operasional.
