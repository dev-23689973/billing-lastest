"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export function makeSoftParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.35)");
  g.addColorStop(0.5, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function DriftingDots({
  count,
  animate,
  color,
  size,
  opacity,
  spreadXZ,
  spreadY,
  spreadZ,
  amp,
  zBase = -12,
}: {
  count: number;
  animate: boolean;
  color: string;
  size: number;
  opacity: number;
  spreadXZ: number;
  spreadY: number;
  spreadZ: number;
  amp: number;
  zBase?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, base, phases, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const baseArr = new Float32Array(count * 3);
    const phasesArr = new Float32Array(count * 3);
    const speedsArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      baseArr[ix] = (Math.random() - 0.5) * spreadXZ;
      baseArr[ix + 1] = (Math.random() - 0.5) * spreadY;
      baseArr[ix + 2] = (Math.random() - 0.5) * spreadZ + zBase;
      positions[ix] = baseArr[ix];
      positions[ix + 1] = baseArr[ix + 1];
      positions[ix + 2] = baseArr[ix + 2];
      phasesArr[ix] = Math.random() * Math.PI * 2;
      phasesArr[ix + 1] = Math.random() * Math.PI * 2;
      phasesArr[ix + 2] = Math.random() * Math.PI * 2;
      speedsArr[ix] = 0.07 + Math.random() * 0.11;
      speedsArr[ix + 1] = 0.06 + Math.random() * 0.1;
      speedsArr[ix + 2] = 0.045 + Math.random() * 0.08;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, base: baseArr, phases: phasesArr, speeds: speedsArr };
  }, [count, spreadXZ, spreadY, spreadZ, zBase]);

  const texture = useMemo(() => makeSoftParticleTexture(), []);

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!animate || !pts) return;
    const t = state.clock.elapsedTime;
    const posAttr = pts.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] =
        base[ix] +
        Math.sin(t * speeds[ix] + phases[ix]) * amp +
        Math.sin(t * 0.1 + phases[ix + 1]) * (amp * 0.2);
      arr[ix + 1] =
        base[ix + 1] +
        Math.cos(t * speeds[ix + 1] * 0.85 + phases[ix + 1]) * (amp * 0.85) +
        Math.sin(t * 0.08 + phases[ix]) * (amp * 0.18);
      arr[ix + 2] =
        base[ix + 2] + Math.sin(t * speeds[ix + 2] * 0.65 + phases[ix + 2]) * (amp * 0.45);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={color}
        map={texture ?? undefined}
        transparent
        opacity={opacity}
        size={size}
        sizeAttenuation={false}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
