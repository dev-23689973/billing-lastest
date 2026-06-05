"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { DriftingDots } from "@/components/theme/livingBackdropParticles";
import { useTabVisible } from "@/lib/motionLifecycle";

/** Midnight navy base — matches UI reference (#020715). */
const BG_COLOR = "#020715";

/** Grid in the XY plane — flat HUD wallpaper; optional slow drift when `animate`. */
function WallpaperPipelines({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.GridHelper>(null);

  useLayoutEffect(() => {
    const gh = ref.current;
    if (!gh) return;
    const mats = gh.material;
    const soften = (m: THREE.Material) => {
      const line = m as THREE.LineBasicMaterial;
      line.transparent = true;
      line.opacity = 0.3;
      line.depthWrite = false;
    };
    if (Array.isArray(mats)) mats.forEach(soften);
    else soften(mats);
  }, []);

  useFrame((state) => {
    const gh = ref.current;
    if (!animate || !gh) return;
    const t = state.clock.elapsedTime;
    gh.position.z = -26 + Math.sin(t * 0.045) * 0.35;
    gh.rotation.z = Math.sin(t * 0.022) * 0.004;
  });

  return (
    <gridHelper
      ref={ref}
      /* Same color for center + grid — avoids bright axis crosshair (GridHelper center lines). */
      args={[200, 168, 0x07121c, 0x07121c]}
      position={[0, 0, -26]}
      rotation={[Math.PI / 2, 0, 0]}
    />
  );
}

/** Finer secondary grid behind the main layer — extra pipeline depth. */
function WallpaperPipelinesFar({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.GridHelper>(null);

  useLayoutEffect(() => {
    const gh = ref.current;
    if (!gh) return;
    const mats = gh.material;
    const soften = (m: THREE.Material) => {
      const line = m as THREE.LineBasicMaterial;
      line.transparent = true;
      line.opacity = 0.03;
      line.depthWrite = false;
    };
    if (Array.isArray(mats)) mats.forEach(soften);
    else soften(mats);
  }, []);

  useFrame((state) => {
    const gh = ref.current;
    if (!animate || !gh) return;
    const t = state.clock.elapsedTime;
    gh.position.z = -34 + Math.cos(t * 0.038) * 0.25;
  });

  return (
    <gridHelper
      ref={ref}
      args={[220, 140, 0x050a14, 0x050a14]}
      position={[0, 0, -34]}
      rotation={[Math.PI / 2, 0, 0]}
    />
  );
}

/**
 * Orthographic mode + `sizeAttenuation={false}` → point `size` is **screen pixels** (not world units).
 */
export default function LivingDotsScene({ animate }: { animate: boolean }) {
  const tabVisible = useTabVisible();
  const runLoop = animate && tabVisible;

  return (
    <Canvas
      frameloop={runLoop ? "always" : "never"}
      orthographic
      camera={{ position: [0, 0, 16], zoom: 46, near: 0.1, far: 160 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(BG_COLOR, 1);
        gl.toneMapping = THREE.NoToneMapping;
        scene.background = new THREE.Color(BG_COLOR);
      }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={[BG_COLOR]} />
      <WallpaperPipelinesFar animate={animate} />
      <WallpaperPipelines animate={animate} />
      <DriftingDots
        count={130}
        animate={animate}
        color="#c5d3ea"
        size={4.2}
        opacity={0.62}
        spreadXZ={66}
        spreadY={42}
        spreadZ={7}
        amp={2}
      />
      <DriftingDots
        count={80}
        animate={animate}
        color="#9eb6dc"
        size={3.25}
        opacity={0.42}
        spreadXZ={72}
        spreadY={46}
        spreadZ={8}
        amp={1.55}
      />
      <DriftingDots
        count={56}
        animate={animate}
        color="#7b93b8"
        size={2.7}
        opacity={0.32}
        spreadXZ={78}
        spreadY={50}
        spreadZ={9}
        amp={1.1}
      />
      {/* Accent dots (subtle multi-color) */}
      <DriftingDots
        count={22}
        animate={animate}
        color="#22d3ee"
        size={3.4}
        opacity={0.22}
        spreadXZ={86}
        spreadY={56}
        spreadZ={10}
        amp={1.35}
      />
      <DriftingDots
        count={18}
        animate={animate}
        color="#a855f7"
        size={3.2}
        opacity={0.18}
        spreadXZ={90}
        spreadY={60}
        spreadZ={11}
        amp={1.2}
      />
      <DriftingDots
        count={14}
        animate={animate}
        color="#34d399"
        size={3.0}
        opacity={0.16}
        spreadXZ={94}
        spreadY={64}
        spreadZ={12}
        amp={1.15}
      />
    </Canvas>
  );
}
