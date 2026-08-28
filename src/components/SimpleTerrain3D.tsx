"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function SimpleTerrain3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color("#f8fafc");
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2("#f8fafc", 0.0035);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 800);
    camera.position.set(0, 28, 95);
    camera.lookAt(0, -3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a7c59, 1.1);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbe8, 2.2);
    sunLight.position.set(-60, 80, -40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 3. Kurva Aliran Sungai
    const riverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-140, 0, -120),
      new THREE.Vector3(-50, 0, -50),
      new THREE.Vector3(10, 0, -10),
      new THREE.Vector3(-10, 0, 30),
      new THREE.Vector3(40, 0, 80),
      new THREE.Vector3(120, 0, 130),
    ]);

    const riverPoints = riverCurve.getPoints(120);

    function distToRiver(x: number, z: number) {
      let minSq = Infinity;
      for (const p of riverPoints) {
        const d = (x - p.x) ** 2 + (z - p.z) ** 2;
        if (d < minSq) minSq = d;
      }
      return Math.sqrt(minSq);
    }

    // 4. Formasi Gunung & Medan
    const segX = 140, segZ = 120;
    const worldW = 320, worldD = 280;
    const vX = segX + 1, vZ = segZ + 1;
    const positions = new Float32Array(vX * vZ * 3);

    let idx = 0;
    for (let j = 0; j < vZ; j++) {
      for (let i = 0; i < vX; i++) {
        const x = -worldW / 2 + (i / segX) * worldW;
        const z = -worldD / 2 + (j / segZ) * worldD;

        const mountainDist = Math.sqrt((x + 20) ** 2 + (z + 80) ** 2);
        const mountainHeight = Math.max(0, 42 - mountainDist * 0.38);

        const hillNoise =
          Math.sin(x * 0.03) * Math.cos(z * 0.03) * 7 +
          Math.sin(x * 0.07 + 1.2) * Math.cos(z * 0.07) * 3;

        let y = mountainHeight + hillNoise;

        const dRiver = distToRiver(x, z);
        const riverBedWidth = 8;
        const bankWidth = 16;

        if (dRiver <= riverBedWidth) {
          y = -4;
        } else if (dRiver <= riverBedWidth + bankWidth) {
          const factor = (dRiver - riverBedWidth) / bankWidth;
          y = THREE.MathUtils.lerp(-4, y, Math.pow(factor, 0.6));
        }

        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
        idx += 3;
      }
    }

    const indices: number[] = [];
    for (let j = 0; j < segZ; j++) {
      for (let i = 0; i < segX; i++) {
        const a = j * vX + i, b = a + 1, c = a + vX, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const terrainGeo = new THREE.BufferGeometry();
    terrainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    terrainGeo.setIndex(indices);
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x5b8c66,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    // 5. Elemen Air Sungai
    const riverGeo = new THREE.BufferGeometry();
    const riverPos: number[] = [];
    const riverWidth = 12;

    for (let i = 0; i < riverPoints.length - 1; i++) {
      const p1 = riverPoints[i];
      const p2 = riverPoints[i + 1];

      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(riverWidth / 2);

      const l1 = new THREE.Vector3().addVectors(p1, perp);
      const r1 = new THREE.Vector3().subVectors(p1, perp);
      const l2 = new THREE.Vector3().addVectors(p2, perp);
      const r2 = new THREE.Vector3().subVectors(p2, perp);

      l1.y = r1.y = l2.y = r2.y = -0.6;

      riverPos.push(
        l1.x, l1.y, l1.z,  r1.x, r1.y, r1.z,  l2.x, l2.y, l2.z,
        r1.x, r1.y, r1.z,  r2.x, r2.y, r2.z,  l2.x, l2.y, l2.z
      );
    }

    riverGeo.setAttribute("position", new THREE.Float32BufferAttribute(riverPos, 3));
    riverGeo.computeVertexNormals();

    const riverMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d9488,
      emissive: 0x0f766e,
      emissiveIntensity: 0.15,
      roughness: 0.1,
      metalness: 0.1,
      reflectivity: 0.9,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    scene.add(riverMesh);

    // 6. 🚧 Pintu Air Ramping & Minimalis (Low-Poly Proposional)
    const gateGroup = new THREE.Group();

    // Diletakkan tepat di lembah sungai
    gateGroup.position.set(10, -2.8, -10);
    gateGroup.rotation.y = Math.PI / 4 + 0.15;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

    // A. Tanggul Samping Ramping (Menancap ke Pinggir Tebing Kiri-Kanan)
    const embankmentGeo = new THREE.BoxGeometry(8, 4.5, 1.8);
    
    const embLeft = new THREE.Mesh(embankmentGeo, concreteMat);
    embLeft.position.set(-10, 1.8, 0);
    embLeft.castShadow = true;
    gateGroup.add(embLeft);

    const embRight = new THREE.Mesh(embankmentGeo, concreteMat);
    embRight.position.set(10, 1.8, 0);
    embRight.castShadow = true;
    gateGroup.add(embRight);

    // B. 3 Pilar Kecil Ramping
    const pillarGeo = new THREE.BoxGeometry(1.2, 5.5, 2.2);

    const pLeft = new THREE.Mesh(pillarGeo, concreteMat);
    pLeft.position.set(-6, 2.2, 0);
    pLeft.castShadow = true;
    gateGroup.add(pLeft);

    const pCenter = new THREE.Mesh(pillarGeo, concreteMat);
    pCenter.position.set(0, 2.2, 0);
    pCenter.castShadow = true;
    gateGroup.add(pCenter);

    const pRight = new THREE.Mesh(pillarGeo, concreteMat);
    pRight.position.set(6, 2.2, 0);
    pRight.castShadow = true;
    gateGroup.add(pRight);

    // C. Jembatan Operasional Ramping
    const bridgeGeo = new THREE.BoxGeometry(20, 0.6, 2.0);
    const bridge = new THREE.Mesh(bridgeGeo, concreteMat);
    bridge.position.set(0, 5.0, 0);
    bridge.castShadow = true;
    gateGroup.add(bridge);

    // D. Daun Pintu Air Tipis (2 Pintu)
    const doorGeo = new THREE.BoxGeometry(4.6, 2.6, 0.25);

    const leftDoor = new THREE.Mesh(doorGeo, metalMat);
    leftDoor.position.set(-3, 1.2, 0);
    leftDoor.castShadow = true;
    gateGroup.add(leftDoor);

    const rightDoor = new THREE.Mesh(doorGeo, metalMat);
    rightDoor.position.set(3, 1.2, 0);
    rightDoor.castShadow = true;
    gateGroup.add(rightDoor);

    // E. Tiang Ulir Ramping (Actuator Rods)
    const rodGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8);

    const rod1 = new THREE.Mesh(rodGeo, ironMat);
    rod1.position.set(-3, 3.8, 0);
    gateGroup.add(rod1);

    const rod2 = new THREE.Mesh(rodGeo, ironMat);
    rod2.position.set(3, 3.8, 0);
    gateGroup.add(rod2);

    scene.add(gateGroup);

    // 7. Trees (Pohon)
    const treeCount = 160;
    const canopyGeo = new THREE.ConeGeometry(1.6, 3.8, 5);
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x22543d, flatShading: true });
    const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    canopyMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < treeCount * 5 && placed < treeCount; i++) {
      const rx = (Math.random() - 0.5) * worldW * 0.8;
      const rz = (Math.random() - 0.5) * worldD * 0.8;

      const dR = distToRiver(rx, rz);
      if (dR > 11 && dR < 40 && rz > -60) {
        dummy.position.set(rx, 2.0, rz);
        const scale = 0.7 + Math.random() * 0.7;
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();

        canopyMesh.setMatrixAt(placed, dummy.matrix);
        placed++;
      }
    }
    canopyMesh.count = placed;
    scene.add(canopyMesh);

    // 8. Loop Animasi
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Lift Pintu Air Halus
      const lift = 1.2 + Math.sin(elapsedTime * 1.2) * 0.35;
      leftDoor.position.y = lift;
      rightDoor.position.y = lift;
      rod1.position.y = lift + 2.5;
      rod2.position.y = lift + 2.5;

      // Slow Orbit Camera
      camera.position.x = Math.sin(elapsedTime * 0.08) * 18;
      camera.position.z = 95 + Math.cos(elapsedTime * 0.08) * 8;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full relative" />;
}