"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import * as THREE from "three"

const PALETTE_3D = {
  bg: "#7BB8CC",
  panel: "#0F2833",
  panelBorder: "#1F4552",
  cream: "#EDE7D6",
  muted: "#9FB8BE",
  safe: "#4FBE85",
  warn: "#D9A441",
  danger: "#D9584B",
}

const WORLD_W = 320, WORLD_D = 280

const STATIONS_3D = [
  { id: "hulu",         name: "Badan Sungai Utama",      desc: "Aliran sungai utama penyuplai air.",                    t: 0.10, curve: "main",  mitigated: false, baseLevel: 1.2 },
  { id: "intake_bawah", name: "Pintu / Intake Bawah",      desc: "Pintu masuk air dari sungai ke danau oxbow.",          t: 0.30, curve: "main",  mitigated: false, baseLevel: 1.3 },
  { id: "oxbow_luar",   name: "Kanal Oxbow Luar & Solar",  desc: "Area kanal luar retensi yang dilengkapi Solar Panel.",  t: 0.50, curve: "oxbow", mitigated: false, baseLevel: 0.9, isStorage: true },
  { id: "oxbow_tengah", name: "Badan Air Retensi Tengah",  desc: "Genangan air sungai masif mengisi penuh interior oxbow.",t: 0.50, curve: "inner", mitigated: true,  baseLevel: 1.0 },
  { id: "pdam",         name: "Kantor & IPA PDAM",         desc: "Instalasi Pengolahan Air Bersih untuk warga.",          t: 0.55, curve: "oxbow", mitigated: true,  baseLevel: 1.0 },
  { id: "intake_atas",  name: "Pintu / Intake Atas",       desc: "Pintu muara pengeluaran air kembali ke sungai.",        t: 0.70, curve: "main",  mitigated: false, baseLevel: 1.4 },
]

const STAGES_3D = [
  { at: 0,   label: "Normal" },
  { at: 30,  label: "Peringatan Dini" },
  { at: 55,  label: "Puncak Siklon" },
  { at: 100, label: "Pasca-Retensi" },
]

interface FeatureLabel {
  id: string
  text: string
  pos: THREE.Vector3
  ox: number
  oy: number
  side?: "left" | "right"
}

const FEATURE_LABELS_3D: FeatureLabel[] = [
  { id: "sungaiLbl",   text: "Badan Sungai Utama",       pos: new THREE.Vector3( 55, 0,  100), ox: 70,  oy: 20 },
  { id: "intakeBawah", text: "Pintu Intake Bawah",       pos: new THREE.Vector3( 25, 0,   50), ox: 70,  oy: -30 },
  { id: "solarLbl",    text: "Floating Solar Panel",     pos: new THREE.Vector3(-55, 0,   -5), ox: -70, oy: -40, side: "left" },
  { id: "innerRiver",  text: "Danau / Air Oxbow Tengah", pos: new THREE.Vector3(-40, 0,    0), ox: 0,   oy: -60 },
  { id: "pdamLbl",     text: "Kantor & IPA PDAM",        pos: new THREE.Vector3(-115,0,    0), ox: -70, oy: -30, side: "left" },
  { id: "intakeAtas",  text: "Pintu Intake Atas",        pos: new THREE.Vector3( 25, 0,  -50), ox: 70,  oy: -20 },
  { id: "irigasiLbl",  text: "Saluran Irigasi",          pos: new THREE.Vector3( 55, 0,  -70), ox: 60,  oy: -40 },
  { id: "sawahLbl",    text: "Lahan Pertanian",          pos: new THREE.Vector3( 90, 0,  -85), ox: 60,  oy: 30 },
  { id: "perumahan",   text: "Pemukiman Warga",          pos: new THREE.Vector3(-120,0,  100), ox: -70, oy: 30,  side: "left" },
]

function floodIntensity(t: number) {
  const x = (t - 55) / 16
  return Math.exp(-x * x)
}

function stationMetrics3D(station: typeof STATIONS_3D[0], t: number) {
  const raw = floodIntensity(t)
  const intensity = station.isStorage ? Math.min(1, raw * 1.35) : station.mitigated ? raw * 0.38 : raw
  const level = station.baseLevel + intensity * 3.2
  let risk = "Aman", color = PALETTE_3D.safe
  if (intensity > 0.66) { risk = "Bahaya"; color = PALETTE_3D.danger }
  else if (intensity > 0.32) { risk = "Waspada"; color = PALETTE_3D.warn }
  return { level, risk, color, intensity }
}

function makeCurves3D() {
  const main = new THREE.CatmullRomCurve3([
    new THREE.Vector3(65, 0,  130),
    new THREE.Vector3(45, 0,   60),
    new THREE.Vector3(75, 0,    0),
    new THREE.Vector3(45, 0,  -60),
    new THREE.Vector3(85, 0, -125),
  ])

  const oxbow = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 20, 0,  50),
    new THREE.Vector3(-45, 0,  50), 
    new THREE.Vector3(-90, 0,  30), 
    new THREE.Vector3(-100,0,   0), 
    new THREE.Vector3(-90, 0, -30),
    new THREE.Vector3(-45, 0, -50), 
    new THREE.Vector3( 20, 0, -50),
  ])

  const irigasi = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 35, 0, -55),
    new THREE.Vector3( 65, 0, -70),
    new THREE.Vector3( 90, 0, -80),
  ])

  const channelBawah = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 48, 0, 50),
    new THREE.Vector3(  5, 0, 50),
  ])
  const channelAtas = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 52, 0, -50),
    new THREE.Vector3(  5, 0, -50),
  ])

  return { main, oxbow, irigasi, channelBawah, channelAtas }
}

function sampleCurvePoints3D(curve: THREE.CatmullRomCurve3, n: number) {
  return Array.from({ length: n + 1 }, (_, i) => curve.getPointAt(Math.min(1, i / n)))
}

function distToSamples3D(x: number, z: number, samples: THREE.Vector3[]) {
  let minSq = Infinity
  for (let i = 0; i < samples.length; i++) {
    const dx = x - samples[i].x
    const dz = z - samples[i].z
    const dSq = dx * dx + dz * dz
    if (dSq < minSq) minSq = dSq
  }
  return Math.sqrt(minSq)
}

const BED_HALF = 7.0, BANK_WIDTH = 10.0, BED_DEPTH = -4.5

function isInsideOxbowArea(x: number, z: number) {
  if (x > 20 || x < -100) return false
  if (z > 50 || z < -50) return false
  const dx = x - 20
  const distSq = dx * dx + z * z
  return distSq <= 120 * 120
}

function terrainHeight3D(x: number, z: number, samples: THREE.Vector3[]) {
  if (isInsideOxbowArea(x, z)) {
    return BED_DEPTH - 0.5
  }

  const dist = distToSamples3D(x, z, samples)
  let base = Math.max(0, Math.sin(x * 0.015) * Math.cos(z * 0.015) * 6.0)

  if (dist <= BED_HALF) return BED_DEPTH
  if (dist <= BED_HALF + BANK_WIDTH) {
    const f = (dist - BED_HALF) / BANK_WIDTH
    const smoothFactor = f * f * (3 - 2 * f)
    return BED_DEPTH * (1 - smoothFactor) + base * smoothFactor
  }
  return base
}

function createWaterTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 256; canvas.height = 512
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#20627A"
  ctx.fillRect(0, 0, 256, 512)
  for (let i = 0; i < 50; i++) {
    const y = Math.random() * 512, h = 15 + Math.random() * 40, w = 40 + Math.random() * 100
    const x = Math.random() * (256 - w)
    const grad = ctx.createLinearGradient(x, y, x + w, y + h)
    grad.addColorStop(0, "rgba(255,255,255,0.0)")
    grad.addColorStop(0.5, "rgba(255,255,255,0.25)")
    grad.addColorStop(1, "rgba(255,255,255,0.0)")
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 4)
  return tex
}

function buildGroundTex3D(curves: ReturnType<typeof makeCurves3D>) {
  const size = 1024
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")!
  const tC = (x: number, z: number): [number, number] => [
    ((x + WORLD_W / 2) / WORLD_W) * size,
    ((z + WORLD_D / 2) / WORLD_D) * size,
  ]

  ctx.fillStyle = "#233F1F"
  ctx.fillRect(0, 0, size, size)

  ctx.beginPath()
  const pStart = tC(20, 50)
  ctx.moveTo(pStart[0], pStart[1])
  for (let i = 0; i <= 100; i++) {
    const p = curves.oxbow.getPointAt(i / 100)
    const [px, py] = tC(p.x, p.z)
    ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = "#1E586E"
  ctx.fill()

  const [sx, sy] = tC(70, -110)
  const boxSize = 22
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#5E8C3B" : "#71A647"
      ctx.fillRect(sx + c * boxSize, sy + r * boxSize, boxSize - 2, boxSize - 2)
    }
  }

  const paintRiver = (curve: THREE.CatmullRomCurve3, segs: number, outer: number, inner: number) => {
    const draw = (w: number, col: string) => {
      ctx.beginPath()
      for (let i = 0; i <= segs; i++) {
        const p = curve.getPointAt(Math.min(1, i / segs))
        const [px, py] = tC(p.x, p.z)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.lineCap = "round"; ctx.lineJoin = "round"
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke()
    }
    draw(outer * (size / WORLD_W), "#5C4F39")
    draw(inner * (size / WORLD_W), "#1E586E")
  }

  paintRiver(curves.main, 100, 22, 16)
  paintRiver(curves.irigasi, 50, 10, 6)
  paintRiver(curves.channelBawah, 20, 14, 10)
  paintRiver(curves.channelAtas, 20, 14, 10)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function buildTerrain3D(segX: number, segZ: number, samples: THREE.Vector3[], texture: THREE.CanvasTexture) {
  const vX = segX + 1, vZ = segZ + 1
  const pos = new Float32Array(vX * vZ * 3), uvs = new Float32Array(vX * vZ * 2)
  let p = 0, u = 0
  for (let j = 0; j < vZ; j++) for (let i = 0; i < segX + 1; i++) {
    const x = -WORLD_W / 2 + (i / segX) * WORLD_W, z = -WORLD_D / 2 + (j / segZ) * WORLD_D
    pos[p] = x; pos[p + 1] = terrainHeight3D(x, z, samples); pos[p + 2] = z
    uvs[u] = i / segX; uvs[u + 1] = j / segZ; p += 3; u += 2
  }
  const idx: number[] = []
  for (let j = 0; j < segZ; j++) for (let i = 0; i < segX; i++) {
    const a = j * vX + i, b = a + 1, c = a + vX, d = c + 1; idx.push(a, c, b, b, c, d)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }))
}

function buildFilledOxbowWater(oxbowCurve: THREE.CatmullRomCurve3, waterTex: THREE.CanvasTexture) {
  const shape = new THREE.Shape()
  const pts = oxbowCurve.getPoints(100)
  shape.moveTo(pts[0].x, -pts[0].z)
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, -pts[i].z)
  }
  shape.closePath()

  const geo = new THREE.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2)

  const mat = new THREE.MeshPhysicalMaterial({
    map: waterTex, color: new THREE.Color("#1B6079"), emissive: new THREE.Color("#0A2B36"),
    emissiveIntensity: 0.35, roughness: 0.1, opacity: 0.9, transparent: true, side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = BED_DEPTH + 2.8
  return { mesh, mat }
}

interface Ribbon3D { 
  mesh: THREE.Mesh; geo: THREE.BufferGeometry; baseYs: Float32Array; count: number; waterTex: THREE.CanvasTexture 
}

function buildRibbonMesh(
  curve: THREE.CatmullRomCurve3, segments: number, width: number, waterTex: THREE.CanvasTexture
): Ribbon3D {
  const count = segments + 1
  const pos = new Float32Array(count * 2 * 3), uvs = new Float32Array(count * 2 * 2), baseYs = new Float32Array(count * 2)
  const idx: number[] = []
  const halfW = width / 2, up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < count; i++) {
    const t = Math.min(0.999, i / segments)
    const pnt = curve.getPointAt(t)
    const tang = curve.getTangentAt(t)
    const perp = new THREE.Vector3().crossVectors(tang, up).normalize()
    
    const L = pnt.clone().add(perp.clone().multiplyScalar(halfW))
    const R = pnt.clone().add(perp.clone().multiplyScalar(-halfW))
    const h = BED_DEPTH + 2.8
    const iL = i * 2, iR = i * 2 + 1

    pos[iL * 3] = L.x; pos[iL * 3 + 1] = h; pos[iL * 3 + 2] = L.z
    pos[iR * 3] = R.x; pos[iR * 3 + 1] = h; pos[iR * 3 + 2] = R.z
    baseYs[iL] = h; baseYs[iR] = h

    uvs[iL * 2] = 0; uvs[iL * 2 + 1] = t * 5
    uvs[iR * 2] = 1; uvs[iR * 2 + 1] = t * 5

    if (i < segments) {
      const a = iL, b = iR, c = iL + 2, d = iR + 2
      idx.push(a, b, c, b, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()

  const mat = new THREE.MeshPhysicalMaterial({
    map: waterTex, color: new THREE.Color("#1B6079"), emissive: new THREE.Color("#0A2B36"),
    emissiveIntensity: 0.35, roughness: 0.1, opacity: 0.88, transparent: true, side: THREE.DoubleSide
  })

  return { mesh: new THREE.Mesh(geo, mat), geo, baseYs, count, waterTex }
}

function updateRibbon3D(rb: Ribbon3D, floodOff: number, elapsed: number, flowSpeed: number) {
  const pos = rb.geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < rb.count; i++) {
    const iL = i * 2, iR = i * 2 + 1
    const rip = Math.sin(i * 0.4 - elapsed * 2.5) * 0.08
    pos.setY(iL, rb.baseYs[iL] + floodOff + rip)
    pos.setY(iR, rb.baseYs[iR] + floodOff + rip)
  }
  pos.needsUpdate = true
  rb.waterTex.offset.y = -(elapsed * flowSpeed) % 1
}

function createHouseMesh() {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 2.5, 3.5),
    new THREE.MeshStandardMaterial({ color: 0xEAE6DF, roughness: 0.7 })
  )
  body.position.y = 1.25; body.castShadow = true; group.add(body)

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.0, 1.8, 4),
    new THREE.MeshStandardMaterial({ color: 0xB84A39, roughness: 0.5 })
  )
  roof.position.y = 3.4; roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof)
  return group
}

function createTreeMesh() {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 2.0, 6),
    new THREE.MeshStandardMaterial({ color: 0x4A3525, roughness: 0.9 })
  )
  trunk.position.y = 1.0; trunk.castShadow = true; group.add(trunk)

  const leaves = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.8),
    new THREE.MeshStandardMaterial({ color: 0x2D5A27, roughness: 0.8 })
  )
  leaves.position.y = 2.8; leaves.castShadow = true; group.add(leaves)
  return group
}

function createPintuIrigasi(pt: THREE.Vector3) {
  const group = new THREE.Group()
  const width = 14.0
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(5.0, 1.4, width),
    new THREE.MeshStandardMaterial({ color: 0x8A969E, roughness: 0.4 })
  )
  deck.position.set(0, 5.0, 0); deck.castShadow = true; group.add(deck)

  const wallL = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 7.0, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x3A444C, roughness: 0.7 })
  )
  wallL.position.set(0, 1.5, -width / 2 + 1)
  const wallR = wallL.clone(); wallR.position.set(0, 1.5, width / 2 - 1)
  group.add(wallL); group.add(wallR)

  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 4.0, width - 4),
    new THREE.MeshStandardMaterial({ color: 0xDDD4B8, roughness: 0.3, metalness: 0.4 })
  )
  leaf.position.set(0, 1.0, 0); leaf.castShadow = true; group.add(leaf)

  group.position.set(pt.x, BED_DEPTH + 0.5, pt.z)
  return { group, leaf, basePosY: 1.0 }
}

function Metric3D({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
      <span style={{ color: PALETTE_3D.muted, fontSize: 12 }}>{label}</span>
      <span style={{ color: valueColor || PALETTE_3D.cream, fontSize: 12.5, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{value}</span>
    </div>
  )
}

export interface DigitalTwinViewerProps {
  score?: number
  gateOpening?: number
}

export function DigitalTwinViewer({ score = 50, gateOpening }: DigitalTwinViewerProps) {
  const effectiveOpening = gateOpening !== undefined ? gateOpening : score

  const mountRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stRef      = useRef({ t: 0, theta: 0.2, phi: 0.6, radius: 250, dragging: false, lastX: 0, lastY: 0, moved: false })
  const openingRef = useRef(effectiveOpening)

  const [timeline, setTimeline] = useState(Math.round(score * 0.55))
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { stRef.current.t = timeline }, [timeline])
  useEffect(() => { openingRef.current = effectiveOpening }, [effectiveOpening])

  const handleSelect = useCallback((id: string) => setSelected(prev => prev === id ? null : id), [])

  useEffect(() => {
    const mount = mountRef.current!
    const W = mount.clientWidth, H = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#7BB8CC")
    scene.fog = new THREE.FogExp2("#9DCFE0", 0.0022)

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 800)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0x9DCFE0, 0x4A6B38, 0.95))
    const sun = new THREE.DirectionalLight(0xFFF5D6, 2.2)
    sun.position.set(-80, 140, -60); sun.castShadow = true
    scene.add(sun)

    const curves = makeCurves3D()
    const samples = [
      ...sampleCurvePoints3D(curves.main, 100),
      ...sampleCurvePoints3D(curves.oxbow, 150),
      ...sampleCurvePoints3D(curves.irigasi, 50),
      ...sampleCurvePoints3D(curves.channelBawah, 20),
      ...sampleCurvePoints3D(curves.channelAtas, 20),
    ]

    const groundTex = buildGroundTex3D(curves)
    const terrain = buildTerrain3D(180, 160, samples, groundTex)
    terrain.receiveShadow = true
    scene.add(terrain)

    const waterTex = createWaterTexture()
    const mainWater    = buildRibbonMesh(curves.main, 120, 14.0, waterTex)
    const filledOxbow  = buildFilledOxbowWater(curves.oxbow, waterTex)
    const irigasiWater = buildRibbonMesh(curves.irigasi, 50, 6.0, waterTex)
    const chBawahWater = buildRibbonMesh(curves.channelBawah, 20, 9.0, waterTex)
    const chAtasWater  = buildRibbonMesh(curves.channelAtas, 20, 9.0, waterTex)

    scene.add(mainWater.mesh); scene.add(filledOxbow.mesh)
    scene.add(irigasiWater.mesh); scene.add(chBawahWater.mesh); scene.add(chAtasWater.mesh)

    // ─── FLOATING SOLAR PANEL DENGAN PELAMPUNG PONTON ──────────────────────────
    const solarGroup = new THREE.Group()
    const pGeo = new THREE.BoxGeometry(4.0, 0.2, 2.5)
    const pMat = new THREE.MeshStandardMaterial({ 
      color: 0x0F2537, 
      roughness: 0.1, 
      metalness: 0.9 
    })
    const pontoonMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        const singlePanelGroup = new THREE.Group()

        const pMesh = new THREE.Mesh(pGeo, pMat)
        pMesh.castShadow = true
        singlePanelGroup.add(pMesh)

        const pontoon = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 2.7), pontoonMat)
        pontoon.position.y = -0.2
        singlePanelGroup.add(pontoon)

        const posX = -70 + c * 4.6
        const posZ = -10 + r * 3.0
        singlePanelGroup.position.set(posX, 0, posZ)

        solarGroup.add(singlePanelGroup)
      }
    }
    scene.add(solarGroup)

    // PDAM Building
    const pdamGroup = new THREE.Group()
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), new THREE.MeshStandardMaterial({ color: 0xCCCCCC }))
    bldg.position.set(-118, 3, 0); bldg.castShadow = true; pdamGroup.add(bldg)
    const tank1 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 5, 16), new THREE.MeshStandardMaterial({ color: 0x6A8FA8 }))
    tank1.position.set(-118, 2.5, 12); tank1.castShadow = true; pdamGroup.add(tank1)
    const tank2 = tank1.clone(); tank2.position.set(-118, 2.5, -12); pdamGroup.add(tank2)
    scene.add(pdamGroup)

    // Pemukiman Warga
    const houseGroup = new THREE.Group()
    const treeGroup  = new THREE.Group()

    const houseCoords = [
      [-130, 80], [-120, 95], [-110, 110], [-135, 60], [-125, 40],
      [-130, -60], [-125, -80], [-115, -100], [-135, -40],
      [60, -90], [75, -100], [85, -110], [95, -95]
    ]
    houseCoords.forEach(([hx, hz]) => {
      const h = createHouseMesh()
      const gy = terrainHeight3D(hx, hz, samples)
      h.position.set(hx, gy, hz)
      h.rotation.y = Math.random() * Math.PI
      houseGroup.add(h)
    })
    scene.add(houseGroup)

    // Pepohonan Rimbun
    for (let i = 0; i < 90; i++) {
      const ang = Math.random() * Math.PI * 2
      const rad = 45 + Math.random() * 100
      const tx = Math.cos(ang) * rad - 30
      const tz = Math.sin(ang) * rad

      if (!isInsideOxbowArea(tx, tz)) {
        const gy = terrainHeight3D(tx, tz, samples)
        if (gy >= 0) {
          const tr = createTreeMesh()
          tr.position.set(tx, gy, tz)
          const sc = 0.8 + Math.random() * 0.5
          tr.scale.set(sc, sc, sc)
          treeGroup.add(tr)
        }
      }
    }
    scene.add(treeGroup)

    // Intake Gates
    const gateBawahObj = createPintuIrigasi(new THREE.Vector3(25, 0, 50))
    const gateAtasObj  = createPintuIrigasi(new THREE.Vector3(25, 0, -50))
    scene.add(gateBawahObj.group); scene.add(gateAtasObj.group)

    // Interactive Markers
    const markerMeshes: Record<string, THREE.Mesh> = {}
    STATIONS_3D.forEach(st => {
      const pos3 = st.curve === "inner" ? new THREE.Vector3(-40, 0, 0) : (st.curve === "oxbow" ? curves.oxbow : curves.main).getPointAt(st.t)
      const gy   = terrainHeight3D(pos3.x, pos3.z, samples)
      const mat  = new THREE.MeshStandardMaterial({ color: PALETTE_3D.warn, emissive: new THREE.Color(PALETTE_3D.warn), emissiveIntensity: 0.6 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 20), mat)
      mesh.position.set(pos3.x, gy + 3.0, pos3.z); mesh.userData.id = st.id; mesh.userData.groundY = gy
      scene.add(mesh); markerMeshes[st.id] = mesh
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.0, 8), new THREE.MeshStandardMaterial({ color: PALETTE_3D.muted }))
      stem.position.set(pos3.x, gy + 1.5, pos3.z); scene.add(stem)
    })

    const overlay = overlayRef.current!
    const dotEls: Record<string, HTMLElement | null> = {}
    const boxEls: Record<string, HTMLElement | null> = {}
    const lineEls: Record<string, SVGLineElement | null> = {}
    FEATURE_LABELS_3D.forEach(l => {
      dotEls[l.id]  = overlay.querySelector(`[data-dot="${l.id}"]`)
      boxEls[l.id]  = overlay.querySelector(`[data-box="${l.id}"]`)
      lineEls[l.id] = overlay.querySelector(`[data-line="${l.id}"]`)
    })

    const s = stRef.current
    const lookTarget = new THREE.Vector3(-10, -2, 0)
    function updateCam() {
      camera.position.set(
        lookTarget.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta),
        lookTarget.y + s.radius * Math.cos(s.phi),
        lookTarget.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta),
      )
      camera.lookAt(lookTarget)
    }
    updateCam()

    const dom = renderer.domElement
    function onPD(e: PointerEvent) { s.dragging = true; s.moved = false; s.lastX = e.clientX; s.lastY = e.clientY }
    function onPM(e: PointerEvent) {
      if (!s.dragging) return
      const dx = e.clientX - s.lastX, dy = e.clientY - s.lastY
      if (Math.abs(dx) + Math.abs(dy) > 2) s.moved = true
      s.theta -= dx * 0.005; s.phi = Math.min(1.4, Math.max(0.2, s.phi - dy * 0.005))
      s.lastX = e.clientX; s.lastY = e.clientY; updateCam()
    }
    function onPU(e: PointerEvent) {
      s.dragging = false
      if (!s.moved) {
        const rect = dom.getBoundingClientRect()
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
        const rc = new THREE.Raycaster(); rc.setFromCamera(mouse, camera)
        const hits = rc.intersectObjects(Object.values(markerMeshes))
        if (hits.length > 0) handleSelect((hits[0].object as THREE.Mesh).userData.id)
      }
    }
    function onWheel(e: WheelEvent) { e.preventDefault(); s.radius = Math.min(340, Math.max(60, s.radius + e.deltaY * 0.08)); updateCam() }
    dom.addEventListener("pointerdown", onPD)
    window.addEventListener("pointermove", onPM)
    window.addEventListener("pointerup", onPU)
    dom.addEventListener("wheel", onWheel, { passive: false })

    const projV = new THREE.Vector3()
    function project3D(v: THREE.Vector3): [number, number] {
      projV.copy(v).project(camera)
      return [((projV.x * 0.5 + 0.5) * W), ((-projV.y * 0.5 + 0.5) * H)]
    }

    let raf: number
    const clock = new THREE.Clock()
    function animate() {
      raf = requestAnimationFrame(animate)
      const el = clock.getElapsedTime()
      const t = stRef.current.t
      const gi = floodIntensity(t), giOx = Math.min(1, gi * 1.35)

      const lift = (openingRef.current / 100) * 3.2
      gateBawahObj.leaf.position.y = gateBawahObj.basePosY + lift
      gateAtasObj.leaf.position.y  = gateAtasObj.basePosY + lift

      // Naik-Turun Air Danau
      const waterY = BED_DEPTH + 2.8 + giOx * 2.2
      filledOxbow.mesh.position.y = waterY

      // Update Elevasi Floating Solar Panel Agar Mengapung & Bergelombang
      solarGroup.children.forEach((child) => {
        child.position.y = waterY + 0.35 + Math.sin(el * 2.5 + child.position.x) * 0.06
      })

      updateRibbon3D(mainWater, gi * 2.0, el, 0.35)
      updateRibbon3D(irigasiWater, gi * 1.5, el, 0.2)
      updateRibbon3D(chBawahWater, gi * 2.0, el, 0.25)
      updateRibbon3D(chAtasWater, gi * 2.0, el, 0.25)

      STATIONS_3D.forEach(st => {
        const m = stationMetrics3D(st, t); const mesh = markerMeshes[st.id]
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color.set(m.color); mat.emissive.set(m.color)
        mesh.position.y = mesh.userData.groundY + 3.0 + m.intensity * 0.5
      })

      FEATURE_LABELS_3D.forEach(l => {
        const [px, py] = project3D(l.pos)
        const dot = dotEls[l.id], box = boxEls[l.id], line = lineEls[l.id]
        if (dot) { dot.style.left = px + "px"; dot.style.top = py + "px" }
        if (box) { box.style.left = (px + l.ox) + "px"; box.style.top = (py + l.oy) + "px" }
        if (line) { line.setAttribute("x1", "" + px); line.setAttribute("y1", "" + py); line.setAttribute("x2", "" + (px + l.ox * 0.85)); line.setAttribute("y2", "" + (py + l.oy * 0.85)) }
      })

      renderer.render(scene, camera)
    }
    animate()

    function onResize() { const w = mount.clientWidth, h = mount.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h) }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPM)
      window.removeEventListener("pointerup", onPU)
      dom.removeEventListener("pointerdown", onPD)
      dom.removeEventListener("wheel", onWheel)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [handleSelect])

  const activeStage = [...STAGES_3D].reverse().find(s => timeline >= s.at) || STAGES_3D[0]
  const selSt = STATIONS_3D.find(s => s.id === selected)
  const selM  = selSt ? stationMetrics3D(selSt, timeline) : null

  return (
    <div style={{
      minHeight: "100vh", background: "#060B10", display: "flex", flexDirection: "column",
      fontFamily: "'Space Grotesk',sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: PALETTE_3D.cream, fontSize: 17, fontWeight: 700, letterSpacing: 0.3 }}>Digital Twin KARBOX - Full Oxbow Lake</p>
          <p style={{ color: PALETTE_3D.muted, fontSize: 11, marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>
            Visualisasi Danau Retensi Masif Interior Tapal Kuda & Floating Solar Panel
          </p>
        </div>
        <div style={{ background: "rgba(15,40,51,0.85)", border: `1px solid ${PALETTE_3D.panelBorder}`, borderRadius: 8, padding: "6px 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: PALETTE_3D.muted, textAlign: "right" }}>
          Seret = putar<br />Scroll = zoom<br />Klik ● = detail
        </div>
      </div>

      {/* 3D Viewport */}
      <div style={{ position: "relative", flex: 1, minHeight: 480 }}>
        <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab", position: "absolute", inset: 0 }} />

        {/* Overlay Leader Lines & Labels */}
        <div ref={overlayRef} style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {FEATURE_LABELS_3D.map(l => (
              <line key={l.id} data-line={l.id} x1={0} y1={0} x2={0} y2={0} stroke="rgba(237,231,214,0.75)" strokeWidth={1.2} />
            ))}
          </svg>
          {FEATURE_LABELS_3D.map(l => (
            <div key={l.id}>
              <div data-dot={l.id} style={{ position: "absolute", width: 8, height: 8, marginLeft: -4, marginTop: -4, borderRadius: "50%", background: PALETTE_3D.cream, boxShadow: "0 0 6px rgba(255,255,255,0.8)" }} />
              <div data-box={l.id} style={{
                position: "absolute",
                transform: l.side === "left" ? "translate(-100%,-50%)" : "translate(0,-50%)",
                background: "rgba(9,26,33,0.85)", border: `1px solid ${PALETTE_3D.panelBorder}`,
                borderRadius: 6, padding: "5px 9px", whiteSpace: "nowrap",
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                <div style={{ color: PALETTE_3D.cream, fontSize: 10.5, fontWeight: 600 }}>{l.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Popup */}
        {selSt && selM && (
          <div style={{
            position: "absolute", top: 12, right: 12, width: 220,
            background: PALETTE_3D.panel, border: `1px solid ${PALETTE_3D.panelBorder}`,
            borderRadius: 10, padding: "14px 14px 16px", zIndex: 6,
            boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ color: PALETTE_3D.cream, fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{selSt.name}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: PALETTE_3D.muted, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <p style={{ color: PALETTE_3D.muted, fontSize: 11.5, marginTop: 6, lineHeight: 1.5 }}>{selSt.desc}</p>
            <div style={{ marginTop: 12, borderTop: `1px solid ${PALETTE_3D.panelBorder}`, paddingTop: 10 }}>
              <Metric3D label="Tinggi muka air" value={`${selM.level.toFixed(2)} m`} />
              <Metric3D label="Status risiko" value={selM.risk} valueColor={selM.color} />
              <Metric3D label="Intensitas" value={`${Math.round(selM.intensity * 100)}%`} />
            </div>
          </div>
        )}
      </div>

      {/* Control Timeline Bar */}
      <div style={{
        background: PALETTE_3D.panel,
        borderTop: `1px solid ${PALETTE_3D.panelBorder}`,
        padding: "16px 20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ color: PALETTE_3D.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace" }}>
              Simulasi Elevasi Air:
            </span>
            <span style={{ color: PALETTE_3D.cream, fontSize: 14, fontWeight: 700, marginLeft: 8 }}>
              {activeStage.label}
            </span>
          </div>
          <span style={{ color: PALETTE_3D.cream, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
            t = {timeline} min
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={timeline}
          onChange={(e) => setTimeline(Number(e.target.value))}
          style={{ width: "100%", accentColor: PALETTE_3D.safe, cursor: "pointer" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          {STAGES_3D.map((stage) => (
            <button
              key={stage.at}
              onClick={() => setTimeline(stage.at)}
              style={{
                background: "transparent", border: "none",
                color: timeline >= stage.at ? PALETTE_3D.cream : PALETTE_3D.muted,
                fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", cursor: "pointer",
                padding: "2px 4px", borderRadius: 4, transition: "color 0.2s",
              }}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DigitalTwinViewer