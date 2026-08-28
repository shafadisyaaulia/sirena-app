"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import * as THREE from "three"

// ═══════════════════════════════════════════════════════════════════════════════
// ─── 3D DIGITAL TWIN (Three.js Engine) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const PALETTE_3D = {
  bg: "#8BBFCE",
  panel: "#0F2833",
  panelBorder: "#1F4552",
  cream: "#EDE7D6",
  muted: "#9FB8BE",
  safe: "#4FBE85",
  warn: "#D9A441",
  danger: "#D9584B",
}
const WORLD_W = 280, WORLD_D = 220

const STATIONS_3D = [
  { id: "hulu",          name: "Hulu Sungai Tamiang",     desc: "Titik pantau paling atas, hulu Sungai Tamiang dari perbukitan Leuser.",   t: 0.07, curve: "main",  mitigated: false, baseLevel: 1.2               },
  { id: "flushing_gate", name: "Flushing Gate",           desc: "Pintu penguras/pebilas lumpur & pelepasan debit air utama ke sungai.",    t: 0.38, curve: "main",  mitigated: false, baseLevel: 1.4               },
  { id: "intake_gate",   name: "Intake Sluice Gate KP-02",desc: "Pintu pengatur alokasi debit air menuju salurn irigasi sawah.",          t: 0.01, curve: "oxbow", mitigated: false, baseLevel: 1.3               },
  { id: "oxbow",         name: "Danau Oxbow (Retensi)",   desc: "Bekas meander Sungai Tamiang yang terpotong, difungsikan retensi banjir.",t: 0.5,  curve: "oxbow", mitigated: false, baseLevel: 0.9, isStorage: true },
  { id: "hilirA",        name: "Hilir – Permukiman A",    desc: "Kawasan padat penduduk ~2km di bawah gerbang retensi.",                 t: 0.75, curve: "main",  mitigated: true,  baseLevel: 1.1               },
]

const STAGES_3D = [
  { at: 0,   label: "Normal"            },
  { at: 30,  label: "Peringatan Dini"   },
  { at: 55,  label: "Puncak Siklon Senyar" },
  { at: 100, label: "Pasca-Retensi"     },
]

interface FeatureLabel {
  id: string
  curve: "main" | "oxbow"
  t: number
  text: string
  numeric: "main" | "oxbow" | null
  ox: number
  oy: number
  side?: "left" | "right"
}

const FEATURE_LABELS_3D: FeatureLabel[] = [
  { id: "meander",      curve: "main",  t: 0.20, text: "Sungai Tamiang — Meander Utama", numeric: "main",  ox: 72,   oy: -60 },
  { id: "oxbow",        curve: "oxbow", t: 0.4,  text: "Danau Oxbow Tamiang",             numeric: "oxbow", ox: 64,   oy: -80 },
  { id: "flushingLbl",  curve: "main",  t: 0.38, text: "Flushing Gate (Pintu Penguras)",  numeric: null,    ox: 60,   oy: 70  },
  { id: "intakeLbl",    curve: "oxbow", t: 0.02, text: "Intake Sluice Gate KP-02",        numeric: null,    ox: -100, oy: -50, side: "left" },
  { id: "irigasi",      curve: "main",  t: 0.80, text: "Irigasi Sawah Hilir",             numeric: null,    ox: 80,   oy: 20  },
  { id: "lahan",        curve: "main",  t: 0.60, text: "Lahan Pertanian – Aceh Tamiang",  numeric: null,    ox: -110, oy: -10, side: "left" },
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
    new THREE.Vector3(-90, 0, -90),
    new THREE.Vector3(-55, 0, -70),
    new THREE.Vector3(-20, 0, -58),
    new THREE.Vector3(10,  0, -48),
    new THREE.Vector3(28,  0, -32),
    new THREE.Vector3(22,  0, -14),
    new THREE.Vector3(8,   0,  -4),
    new THREE.Vector3(-10, 0,   8),
    new THREE.Vector3(-22, 0,  25),
    new THREE.Vector3(-10, 0,  44),
    new THREE.Vector3(12,  0,  62),
    new THREE.Vector3(40,  0,  80),
    new THREE.Vector3(70,  0,  90),
  ])

  const oxbow = new THREE.CatmullRomCurve3([
    new THREE.Vector3(10,  0, -4),
    new THREE.Vector3(28,  0,  2),
    new THREE.Vector3(48,  0, -4),
    new THREE.Vector3(58,  0, -18),
    new THREE.Vector3(54,  0, -34),
    new THREE.Vector3(40,  0, -46),
    new THREE.Vector3(22,  0, -44),
    new THREE.Vector3(10,  0, -32),
    new THREE.Vector3(8,   0, -18),
  ], true)

  return { main, oxbow }
}

function distToSamples3D(x: number, z: number, samples: THREE.Vector3[]) {
  let min = Infinity
  for (const s of samples) {
    const d = (x - s.x) ** 2 + (z - s.z) ** 2
    if (d < min) min = d
  }
  return Math.sqrt(min)
}

function sampleCurvePoints3D(curve: THREE.CatmullRomCurve3, n: number) {
  return Array.from({ length: n + 1 }, (_, i) => curve.getPointAt(Math.min(1, i / n)))
}

function terrainNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.028 + 0.8) * Math.cos(z * 0.032 + 0.5) * 5.5 +
    Math.sin(x * 0.07  + 2.1) * Math.cos(z * 0.065 + 1.3) * 2.2 +
    Math.sin(x * 0.14  - 0.6) * Math.cos(z * 0.12  - 0.9) * 0.9 +
    Math.sin((x + z) * 0.022 + 0.4) * 1.8
  )
}

function ridgeHeight(x: number, z: number) {
  const d = Math.sqrt(Math.max(0, (-x - 40) ** 2 * 0.006 + (-z - 50) ** 2 * 0.006))
  return Math.max(0, 14 - d * 1.4)
}

const BED_HALF = 6.5, BANK_WIDTH = 16, BED_DEPTH = -9.0

function terrainHeight3D(x: number, z: number, samples: THREE.Vector3[]) {
  const noise = terrainNoise(x, z)
  const ridge = ridgeHeight(x, z)
  const base  = noise + ridge
  const dist  = distToSamples3D(x, z, samples)
  const bed   = BED_DEPTH + noise * 0.15
  if (dist <= BED_HALF) return bed
  if (dist <= BED_HALF + BANK_WIDTH) {
    const f = (dist - BED_HALF) / BANK_WIDTH
    const e = Math.pow(f, 0.5) * (3 - 2 * Math.pow(f, 0.5)) * f
    return bed * (1 - e) + base * e
  }
  return base
}

function buildGroundTex3D(mainC: THREE.CatmullRomCurve3, oxC: THREE.CatmullRomCurve3, samples: THREE.Vector3[]) {
  const size = 1536
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")!
  const tC = (x: number, z: number): [number, number] => [
    ((x + WORLD_W / 2) / WORLD_W) * size,
    ((z + WORLD_D / 2) / WORLD_D) * size,
  ]

  const bg = ctx.createLinearGradient(0, 0, size, size)
  bg.addColorStop(0, "#4c6a3c"); bg.addColorStop(1, "#3e5931")
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 12; i++) for (let j = 0; j < 10; j++) {
    const x0 = -WORLD_W/2+(i/12)*WORLD_W, x1 = -WORLD_W/2+((i+1)/12)*WORLD_W
    const z0 = -WORLD_D/2+(j/10)*WORLD_D, z1 = -WORLD_D/2+((j+1)/10)*WORLD_D
    if (distToSamples3D((x0+x1)/2,(z0+z1)/2,samples) < 15) continue
    const [px0,py0] = tC(x0,z0); const [px1,py1] = tC(x1,z1)
    ctx.fillStyle = `hsl(${88+Math.random()*24},40%,${27+Math.random()*11}%)`
    ctx.fillRect(px0,py0,px1-px0,py1-py0)
    ctx.strokeStyle = "rgba(18,26,12,0.45)"; ctx.lineWidth = 2.2
    ctx.strokeRect(px0,py0,px1-px0,py1-py0)
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1
    for (let f = 1; f < 4; f++) {
      const fx = px0+((px1-px0)*f)/4
      ctx.beginPath(); ctx.moveTo(fx,py0+3); ctx.lineTo(fx,py1-3); ctx.stroke()
    }
  }

  ctx.strokeStyle = "rgba(120,200,210,0.55)"; ctx.lineWidth = 2.4
  ;[0.72,0.80,0.88].forEach(t => {
    const p = mainC.getPointAt(t); const [px,py] = tC(p.x,p.z)
    const [ex,ey] = tC(p.x+26,p.z+(Math.random()>0.5?10:-10))
    ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(ex,ey); ctx.stroke()
  })

  const paintSand = (curve: THREE.CatmullRomCurve3, ts: number[], r: number) => ts.forEach(t => {
    const p = curve.getPointAt(t); const [px,py] = tC(p.x,p.z)
    const g = ctx.createRadialGradient(px,py,0,px,py,r)
    g.addColorStop(0,"rgba(210,193,150,0.95)"); g.addColorStop(1,"rgba(210,193,150,0)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill()
  })
  paintSand(mainC,[0.32,0.66],size*0.055); paintSand(oxC,[0.15,0.78],size*0.05)

  const paintRiver = (curve: THREE.CatmullRomCurve3, segs: number, outer: number, mid: number, inner: number, closed: boolean) => {
    const draw = (w: number, col: string) => {
      ctx.beginPath()
      for (let i = 0; i <= segs; i++) {
        const p = curve.getPointAt(Math.min(1,i/segs)); const [px,py] = tC(p.x,p.z)
        i===0?ctx.moveTo(px,py):ctx.lineTo(px,py)
      }
      if (closed) ctx.closePath()
      ctx.lineCap="round"; ctx.lineJoin="round"; ctx.strokeStyle=col; ctx.lineWidth=w; ctx.stroke()
    }
    draw(outer,"#c7b487"); draw(mid,"#3f97b0"); draw(inner,"#1d6c88")
  }
  const s = size/WORLD_W
  paintRiver(mainC,220,7.0*s,5.2*s,2.8*s,false)
  paintRiver(oxC, 160,8.8*s,6.8*s,4.0*s,true)

  const paintForest = (curve: THREE.CatmullRomCurve3, segs: number, band: number) => {
    const up = new THREE.Vector3(0,1,0)
    for (let i = 0; i < segs; i++) {
      const p = curve.getPointAt(i/segs); const tangent = curve.getTangentAt(i/segs)
      const perp = new THREE.Vector3().crossVectors(tangent,up).normalize()
      ;[-1,1].forEach(side => {
        if (Math.random()>0.58) return
        const off = band*(0.9+Math.random()*0.7)
        const [px,py] = tC(p.x+perp.x*off*side,p.z+perp.z*off*side)
        const r = (3+Math.random()*5)*(size/900)
        ctx.fillStyle = `hsl(${96+Math.random()*18},38%,${13+Math.random()*7}%)`
        ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill()
      })
    }
  }
  paintForest(mainC,110,7); paintForest(oxC,90,7)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function buildTerrain3D(segX: number, segZ: number, samples: THREE.Vector3[], texture: THREE.CanvasTexture) {
  const vX = segX+1, vZ = segZ+1
  const pos = new Float32Array(vX*vZ*3), uvs = new Float32Array(vX*vZ*2)
  let p=0, u=0
  for (let j=0; j<vZ; j++) for (let i=0; i<vX; i++) {
    const x = -WORLD_W/2+(i/segX)*WORLD_W, z = -WORLD_D/2+(j/segZ)*WORLD_D
    pos[p]=x; pos[p+1]=terrainHeight3D(x,z,samples); pos[p+2]=z
    uvs[u]=i/segX; uvs[u+1]=j/segZ; p+=3; u+=2
  }
  const idx: number[] = []
  for (let j=0;j<segZ;j++) for (let i=0;i<segX;i++) {
    const a=j*vX+i,b=a+1,c=a+vX,d=c+1; idx.push(a,c,b,b,c,d)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3))
  geo.setAttribute("uv",new THREE.BufferAttribute(uvs,2))
  geo.setIndex(idx); geo.computeVertexNormals()
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}))
}

interface Ribbon3D { mesh: THREE.Mesh; geo: THREE.BufferGeometry; baseYs: Float32Array; count: number }

function buildRibbon3D(curve: THREE.CatmullRomCurve3, segments: number, width: number, samples: THREE.Vector3[], color: string, opacity: number): Ribbon3D {
  const count = segments+1
  const pos = new Float32Array(count*2*3), baseYs = new Float32Array(count*2)
  const idx: number[] = [], halfW = width/2, up = new THREE.Vector3(0,1,0)
  for (let i=0;i<count;i++) {
    const t = Math.min(0.999,i/segments)
    const pnt = curve.getPointAt(t); const tang = curve.getTangentAt(t)
    const perp = new THREE.Vector3().crossVectors(tang,up).normalize()
    const L = pnt.clone().add(perp.clone().multiplyScalar(halfW))
    const R = pnt.clone().add(perp.clone().multiplyScalar(-halfW))
    const hL = terrainHeight3D(L.x,L.z,samples)+0.6
    const hR = terrainHeight3D(R.x,R.z,samples)+0.6
    const iL=i*2,iR=i*2+1
    pos[iL*3]=L.x;pos[iL*3+1]=hL;pos[iL*3+2]=L.z
    pos[iR*3]=R.x;pos[iR*3+1]=hR;pos[iR*3+2]=R.z
    baseYs[iL]=hL; baseYs[iR]=hR
    if (i<segments) { const a=iL,b=iR,c=iL+2,d=iR+2; idx.push(a,b,c,b,d,c) }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3))
  geo.setIndex(idx); geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color), emissiveIntensity:0.22,
    roughness:0.25,metalness:0.2,transparent:true,opacity,side:THREE.DoubleSide,
  })
  return { mesh: new THREE.Mesh(geo,mat), geo, baseYs, count }
}

function updateRibbon3D(rb: Ribbon3D, floodOff: number, elapsed: number, rAmp: number) {
  const pos = rb.geo.attributes.position as THREE.BufferAttribute
  for (let i=0;i<rb.count;i++) {
    const iL=i*2,iR=i*2+1, rip=Math.sin(i*0.5-elapsed*2.4)*rAmp
    pos.setY(iL,rb.baseYs[iL]+floodOff+rip); pos.setY(iR,rb.baseYs[iR]+floodOff+rip)
  }
  pos.needsUpdate=true; rb.geo.computeVertexNormals()
}

function createGateStructure(pt: THREE.Vector3, gy0: number, gateColor: number) {
  const group = new THREE.Group()

  const deckM = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.5, 3),
    new THREE.MeshStandardMaterial({ color: 0xB8C4CA, roughness: 0.7 })
  )
  deckM.position.set(pt.x, gy0 + 3.2, pt.z)
  deckM.castShadow = true; group.add(deckM)

  for (const xi of [-2.8, 2.8]) for (const zi of [-1.1, 1.1]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 4.5, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x2B6480 })
    )
    post.position.set(pt.x + xi, gy0 + 1.0, pt.z + zi)
    post.castShadow = true; group.add(post)
  }

  const gateLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 3.8, 0.25),
    new THREE.MeshStandardMaterial({ color: gateColor, roughness: 0.6, metalness: 0.4 })
  )
  gateLeaf.position.set(pt.x, gy0 + 1.4, pt.z)
  gateLeaf.castShadow = true; group.add(gateLeaf)

  return { group, gateLeaf, basePosY: gy0 + 1.4 }
}

function Metric3D({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
      <span style={{ color:PALETTE_3D.muted, fontSize:12 }}>{label}</span>
      <span style={{ color:valueColor||PALETTE_3D.cream, fontSize:12.5, fontWeight:600, fontFamily:"'JetBrains Mono',monospace" }}>{value}</span>
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
  const stRef      = useRef({ t:0, theta:0.82, phi:0.62, radius:140, dragging:false, lastX:0, lastY:0, moved:false })
  const openingRef = useRef(effectiveOpening)

  const [timeline, setTimeline]   = useState(Math.round(score * 0.55))
  const [selected, setSelected]   = useState<string|null>(null)

  useEffect(() => { stRef.current.t = timeline }, [timeline])
  useEffect(() => { openingRef.current = effectiveOpening }, [effectiveOpening])

  const handleSelect = useCallback((id: string) =>
    setSelected(prev => prev===id ? null : id), [])

  useEffect(() => {
    const mount = mountRef.current!
    const W = mount.clientWidth, H = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#7BB8CC")
    scene.fog = new THREE.FogExp2("#9DCFE0", 0.0048)

    const camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 600)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0x9DCFE0, 0x6B8C5A, 0.9))

    const sun = new THREE.DirectionalLight(0xFFF5D6, 2.2)
    sun.position.set(-80, 100, -60)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far   = 400
    sun.shadow.camera.left = -160; sun.shadow.camera.right = 160
    sun.shadow.camera.top   =  130; sun.shadow.camera.bottom = -130
    sun.shadow.bias = -0.001
    scene.add(sun)

    const fill = new THREE.DirectionalLight(0xB8D8F0, 0.55)
    fill.position.set(80, 40, 60)
    scene.add(fill)

    const { main: mainC, oxbow: oxC } = makeCurves3D()
    const samples = [...sampleCurvePoints3D(mainC,80), ...sampleCurvePoints3D(oxC,60)]

    const groundTex = buildGroundTex3D(mainC, oxC, samples)
    const terrain = buildTerrain3D(180, 140, samples, groundTex)
    terrain.receiveShadow = true
    scene.add(terrain)

    const waterColor = "#2A7FA8"
    const mShallow = buildRibbon3D(mainC,180,8.5,samples,"#4AAEC8",0.72)
    const mDeep    = buildRibbon3D(mainC,180,5.5,samples,waterColor,0.96)
    const oShallow = buildRibbon3D(oxC, 140,10.0,samples,"#4AAEC8",0.68)
    const oDeep    = buildRibbon3D(oxC, 140, 7.0,samples,waterColor,0.96)
    ;[mShallow,mDeep,oShallow,oDeep].forEach(r=>{
      r.mesh.receiveShadow = true
      const old = r.mesh.material as THREE.MeshStandardMaterial
      r.mesh.material = new THREE.MeshPhysicalMaterial({
        color: old.color, emissive: old.emissive, emissiveIntensity: 0.05,
        roughness: 0.08, metalness: 0.0, reflectivity: 0.9,
        transparent: true, opacity: old.opacity, side: THREE.DoubleSide,
        envMapIntensity: 1.2,
      })
      scene.add(r.mesh)
    })

    const gatePt  = mainC.getPointAt(0.38)
    const oxMouth = oxC.getPointAt(0.0)
    const chanC   = new THREE.CatmullRomCurve3([
      gatePt,
      new THREE.Vector3((gatePt.x+oxMouth.x)/2+4, 0, (gatePt.z+oxMouth.z)/2-2),
      oxMouth,
    ])
    const channel = buildRibbon3D(chanC, 24, 3.5, samples, "#3f97b0", 0.88)
    scene.add(channel.mesh)

    const gyFlushing = terrainHeight3D(gatePt.x, gatePt.z, samples)
    const flushingGateObj = createGateStructure(gatePt, gyFlushing, 0x1A4F68)
    scene.add(flushingGateObj.group)

    const intakePt = oxC.getPointAt(0.02)
    const gyIntake = terrainHeight3D(intakePt.x, intakePt.z, samples)
    const intakeGateObj = createGateStructure(intakePt, gyIntake, 0x165B4C)
    scene.add(intakeGateObj.group)

    const arrowShape = new THREE.Shape()
    arrowShape.moveTo(1,0); arrowShape.lineTo(-0.55,0.55); arrowShape.lineTo(-0.25,0); arrowShape.lineTo(-0.55,-0.55); arrowShape.lineTo(1,0)
    const aGeo = new THREE.ShapeGeometry(arrowShape); aGeo.rotateX(-Math.PI/2)
    const aMat = new THREE.MeshStandardMaterial({ color:"#eafcff", emissive:new THREE.Color("#eafcff"), emissiveIntensity:0.55, transparent:true, opacity:0.85, side:THREE.DoubleSide })
    const flowAxis = new THREE.Vector3(1,0,0)
    function buildFlow(n: number, curve: THREE.CatmullRomCurve3) {
      const grp = new THREE.Group(); scene.add(grp)
      return Array.from({length:n},(_,i)=>{ const m=new THREE.Mesh(aGeo,aMat); grp.add(m); return {mesh:m,phase:i/n,curve} })
    }
    function updateFlow(items: {mesh:THREE.Mesh,phase:number,curve:THREE.CatmullRomCurve3}[], speed: number, elapsed: number) {
      items.forEach(fm=>{
        const t=(fm.phase+elapsed*speed)%1
        const p=fm.curve.getPointAt(t); const tang=fm.curve.getTangentAt(t)
        fm.mesh.position.set(p.x,terrainHeight3D(p.x,p.z,samples)+1.0,p.z)
        fm.mesh.quaternion.setFromUnitVectors(flowAxis,new THREE.Vector3(tang.x,0,tang.z).normalize())
      })
    }
    const mainFlow = buildFlow(12,mainC); const oxFlow = buildFlow(7,oxC)

    const canopyGeo = new THREE.SphereGeometry(1, 7, 7)
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2D5530 })
    const canopyM   = new THREE.InstancedMesh(canopyGeo, canopyMat, 360)
    canopyM.castShadow = true; canopyM.receiveShadow = true
    const dummy = new THREE.Object3D(); let placed = 0, att = 0
    while (placed < 360 && att < 3000) {
      att++
      const x = (Math.random() - 0.5) * WORLD_W * 0.92
      const z = (Math.random() - 0.5) * WORLD_D * 0.92
      const d = distToSamples3D(x, z, samples)
      if (d < BED_HALF + BANK_WIDTH - 2 || d > BED_HALF + BANK_WIDTH + 18) continue
      const y = terrainHeight3D(x, z, samples)
      if (y < -1) continue
      dummy.position.set(x, y + 1.0, z)
      const sc = 0.7 + Math.random() * 1.4
      dummy.scale.set(sc, sc * (0.9 + Math.random() * 0.6), sc)
      dummy.rotation.y = Math.random() * Math.PI * 2
      dummy.updateMatrix()
      canopyM.setMatrixAt(placed, dummy.matrix); placed++
    }
    canopyM.count = placed; scene.add(canopyM)

    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4A3020 })
    const trunkM   = new THREE.InstancedMesh(trunkGeo, trunkMat, placed)
    trunkM.castShadow = true
    for (let i = 0; i < placed; i++) {
      canopyM.getMatrixAt(i, dummy.matrix)
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
      dummy.position.y -= 1.8; dummy.scale.set(1, 1, 1); dummy.updateMatrix()
      trunkM.setMatrixAt(i, dummy.matrix)
    }
    scene.add(trunkM)

    const markerMeshes: Record<string,THREE.Mesh> = {}
    STATIONS_3D.forEach(st=>{
      const curve = st.curve==="oxbow"?oxC:mainC
      const pos3  = curve.getPointAt(st.t)
      const gy    = terrainHeight3D(pos3.x,pos3.z,samples)
      const mat   = new THREE.MeshStandardMaterial({color:PALETTE_3D.warn,emissive:new THREE.Color(PALETTE_3D.warn),emissiveIntensity:0.6})
      const mesh  = new THREE.Mesh(new THREE.SphereGeometry(1.1,20,20),mat)
      mesh.position.set(pos3.x,gy+2.6,pos3.z); mesh.userData.id=st.id; mesh.userData.groundY=gy
      scene.add(mesh); markerMeshes[st.id]=mesh
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,2.6,8), new THREE.MeshStandardMaterial({color:PALETTE_3D.muted}))
      stem.position.set(pos3.x,gy+1.3,pos3.z); scene.add(stem)
    })

    const labelAnchors: Record<string,THREE.Vector3> = {}
    FEATURE_LABELS_3D.forEach(l=>{
      const curve = l.curve==="oxbow"?oxC:mainC
      const p     = curve.getPointAt(l.t)
      labelAnchors[l.id] = new THREE.Vector3(p.x,terrainHeight3D(p.x,p.z,samples)+2,p.z)
    })

    const overlay = overlayRef.current!
    const dotEls: Record<string,HTMLElement|null> = {}
    const boxEls: Record<string,HTMLElement|null> = {}
    const lineEls: Record<string,SVGLineElement|null> = {}
    const numEls: Record<string,HTMLElement|null> = {}
    FEATURE_LABELS_3D.forEach(l=>{
      dotEls[l.id]  = overlay.querySelector(`[data-dot="${l.id}"]`)
      boxEls[l.id]  = overlay.querySelector(`[data-box="${l.id}"]`)
      lineEls[l.id] = overlay.querySelector(`[data-line="${l.id}"]`)
      numEls[l.id]  = overlay.querySelector(`[data-num="${l.id}"]`)
    })

    const s = stRef.current
    const lookTarget = new THREE.Vector3(10, -2, -10)
    function updateCam() {
      camera.position.set(
        lookTarget.x + s.radius*Math.sin(s.phi)*Math.sin(s.theta),
        lookTarget.y + s.radius*Math.cos(s.phi),
        lookTarget.z + s.radius*Math.sin(s.phi)*Math.cos(s.theta),
      )
      camera.lookAt(lookTarget)
    }
    updateCam()
    const dom = renderer.domElement
    function onPD(e: PointerEvent) { s.dragging=true; s.moved=false; s.lastX=e.clientX; s.lastY=e.clientY }
    function onPM(e: PointerEvent) {
      if (!s.dragging) return
      const dx=e.clientX-s.lastX, dy=e.clientY-s.lastY
      if (Math.abs(dx)+Math.abs(dy)>2) s.moved=true
      s.theta-=dx*0.006; s.phi=Math.min(1.4,Math.max(0.35,s.phi-dy*0.006))
      s.lastX=e.clientX; s.lastY=e.clientY; updateCam()
    }
    function onPU(e: PointerEvent) {
      s.dragging=false
      if (!s.moved) {
        const rect=dom.getBoundingClientRect()
        const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1)
        const rc=new THREE.Raycaster(); rc.setFromCamera(mouse,camera)
        const hits=rc.intersectObjects(Object.values(markerMeshes))
        if (hits.length>0) handleSelect((hits[0].object as THREE.Mesh).userData.id)
      }
    }
    function onWheel(e: WheelEvent) { e.preventDefault(); s.radius=Math.min(240,Math.max(55,s.radius+e.deltaY*0.07)); updateCam() }
    dom.addEventListener("pointerdown",onPD)
    window.addEventListener("pointermove",onPM)
    window.addEventListener("pointerup",onPU)
    dom.addEventListener("wheel",onWheel,{passive:false})

    const projV = new THREE.Vector3()
    function project3D(v: THREE.Vector3): [number,number] {
      projV.copy(v).project(camera)
      return [((projV.x*0.5+0.5)*W),((-projV.y*0.5+0.5)*H)]
    }

    let raf: number
    const clock = new THREE.Clock()
    function animate() {
      raf=requestAnimationFrame(animate)
      const el=clock.getElapsedTime()
      const t=stRef.current.t
      const gi=floodIntensity(t), giOx=Math.min(1,gi*1.3)

      const liftOffset = (openingRef.current / 100) * 2.8
      flushingGateObj.gateLeaf.position.y = flushingGateObj.basePosY + liftOffset
      intakeGateObj.gateLeaf.position.y = intakeGateObj.basePosY + liftOffset

      updateRibbon3D(mShallow,gi*2.2,el,0.10); updateRibbon3D(mDeep,gi*2.2,el*1.1,0.12)
      updateRibbon3D(oShallow,giOx*2.4,el*0.8,0.07); updateRibbon3D(oDeep,giOx*2.4,el*0.9,0.09)
      updateRibbon3D(channel,gi*2.0,el,0.08)
      updateFlow(mainFlow,0.05+gi*0.09,el); updateFlow(oxFlow,0.02+giOx*0.03,el)
      const deepMix=new THREE.Color("#1d6c88").lerp(new THREE.Color(PALETTE_3D.danger),Math.min(1,gi*0.9))
      const mDeepMat = mDeep.mesh.material as THREE.MeshStandardMaterial
      mDeepMat.color.copy(deepMix); mDeepMat.emissive.copy(deepMix)
      STATIONS_3D.forEach(st=>{
        const m=stationMetrics3D(st,t); const mesh=markerMeshes[st.id]
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color.set(m.color); mat.emissive.set(m.color)
        mesh.position.y=mesh.userData.groundY+2.6+m.intensity*0.5
        mesh.scale.setScalar(1+Math.sin(el*3+st.t*10)*(m.intensity>0.32?0.09:0.02))
      })
      FEATURE_LABELS_3D.forEach(l=>{
        const [px,py]=project3D(labelAnchors[l.id])
        const dot=dotEls[l.id],box=boxEls[l.id],line=lineEls[l.id],num=numEls[l.id]
        if (dot) { dot.style.left=px+"px"; dot.style.top=py+"px" }
        if (box) { box.style.left=(px+l.ox)+"px"; box.style.top=(py+l.oy)+"px" }
        if (line) { line.setAttribute("x1",""+px);line.setAttribute("y1",""+py);line.setAttribute("x2",""+(px+l.ox*0.85));line.setAttribute("y2",""+(py+l.oy*0.85)) }
        if (num) {
          if (l.numeric==="main")  num.textContent=`Level: ${(0.6+gi*3.2).toFixed(1)}m · Debit: ${Math.round(18+gi*68)} m³/s`
          if (l.numeric==="oxbow") num.textContent=`Level: ${(0.5+giOx*2.5).toFixed(1)}m · Debit: ${Math.round(10+giOx*52)} m³/s`
        }
      })
      renderer.render(scene,camera)
    }
    animate()

    function onResize() { const w=mount.clientWidth,h=mount.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h) }
    window.addEventListener("resize",onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize",onResize)
      window.removeEventListener("pointermove",onPM)
      window.removeEventListener("pointerup",onPU)
      dom.removeEventListener("pointerdown",onPD)
      dom.removeEventListener("wheel",onWheel)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [handleSelect])

  const activeStage = [...STAGES_3D].reverse().find(s=>timeline>=s.at)||STAGES_3D[0]
  const selSt = STATIONS_3D.find(s=>s.id===selected)
  const selM  = selSt ? stationMetrics3D(selSt,timeline) : null

  return (
    <div style={{
      minHeight:"100vh", background:"#060B10", display:"flex", flexDirection:"column",
      fontFamily:"'Space Grotesk',sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding:"24px 20px 10px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <p style={{ color:PALETTE_3D.cream, fontSize:17, fontWeight:700, letterSpacing:0.3 }}>Digital Twin Sungai</p>
          <p style={{ color:PALETTE_3D.muted, fontSize:11, marginTop:3, fontFamily:"'JetBrains Mono',monospace" }}>
            Oxbow Lake · Aceh Tamiang
          </p>
        </div>
        <div style={{ background:"rgba(15,40,51,0.85)", border:`1px solid ${PALETTE_3D.panelBorder}`, borderRadius:8, padding:"6px 11px", fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:PALETTE_3D.muted, textAlign:"right" }}>
          Seret = putar<br/>Scroll = zoom<br/>Klik ● = detail
        </div>
      </div>

      {/* 3D Viewport */}
      <div style={{ position:"relative", flex:1, minHeight:420 }}>
        <div ref={mountRef} style={{ width:"100%", height:"100%", cursor:"grab", position:"absolute", inset:0 }} />

        {/* Leader-line Overlay */}
        <div ref={overlayRef} style={{ position:"absolute", inset:0, zIndex:4, pointerEvents:"none" }}>
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
            {FEATURE_LABELS_3D.map(l=>(
              <line key={l.id} data-line={l.id} x1={0} y1={0} x2={0} y2={0} stroke="rgba(237,231,214,0.75)" strokeWidth={1.2} />
            ))}
          </svg>
          {FEATURE_LABELS_3D.map(l=>(
            <div key={l.id}>
              <div data-dot={l.id} style={{ position:"absolute", width:8, height:8, marginLeft:-4, marginTop:-4, borderRadius:"50%", background:PALETTE_3D.cream, boxShadow:"0 0 6px rgba(255,255,255,0.8)" }} />
              <div data-box={l.id} style={{
                position:"absolute",
                transform: l.side==="left" ? "translate(-100%,-50%)" : "translate(0,-50%)",
                background:"rgba(9,26,33,0.82)", border:`1px solid ${PALETTE_3D.panelBorder}`,
                borderRadius:6, padding:"5px 9px", whiteSpace:"nowrap",
                fontFamily:"'JetBrains Mono',monospace",
              }}>
                <div style={{ color:PALETTE_3D.cream, fontSize:10.5, fontWeight:600 }}>{l.text}</div>
                {l.numeric && <div data-num={l.id} style={{ color:PALETTE_3D.muted, fontSize:9.5, marginTop:2 }} />}
              </div>
            </div>
          ))}
        </div>

        {/* Detail Popup */}
        {selSt && selM && (
          <div style={{
            position:"absolute", top:12, right:12, width:220,
            background:PALETTE_3D.panel, border:`1px solid ${PALETTE_3D.panelBorder}`,
            borderRadius:10, padding:"14px 14px 16px", zIndex:6,
            boxShadow:"0 8px 30px rgba(0,0,0,0.45)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ color:PALETTE_3D.cream, fontWeight:700, fontSize:14, lineHeight:1.25 }}>{selSt.name}</div>
              <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:PALETTE_3D.muted, cursor:"pointer", fontSize:16 }}>×</button>
            </div>
            <p style={{ color:PALETTE_3D.muted, fontSize:11.5, marginTop:6, lineHeight:1.5 }}>{selSt.desc}</p>
            <div style={{ marginTop:12, borderTop:`1px solid ${PALETTE_3D.panelBorder}`, paddingTop:10 }}>
              <Metric3D label="Tinggi muka air" value={`${selM.level.toFixed(2)} m`} />
              <Metric3D label="Status risiko" value={selM.risk} valueColor={selM.color} />
              <Metric3D label="Intensitas" value={`${Math.round(selM.intensity*100)}%`} />
              {selSt.mitigated && (
                <Metric3D label="Reduksi Retensi" value="Aktif (-62%)" valueColor={PALETTE_3D.safe} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
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
              Fase Simulasi:
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
          style={{
            width: "100%",
            accentColor: PALETTE_3D.safe,
            cursor: "pointer",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          {STAGES_3D.map((stage) => (
            <button
              key={stage.at}
              onClick={() => setTimeline(stage.at)}
              style={{
                background: "transparent",
                border: "none",
                color: timeline >= stage.at ? PALETTE_3D.cream : PALETTE_3D.muted,
                fontSize: 10.5,
                fontFamily: "'JetBrains Mono',monospace",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 4,
                transition: "color 0.2s",
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