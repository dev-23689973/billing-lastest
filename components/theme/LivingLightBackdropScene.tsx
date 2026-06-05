"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { DriftingDots } from "@/components/theme/livingBackdropParticles";
import { useTabVisible } from "@/lib/motionLifecycle";

/** Solid white base — 100% opacity (living motion from particles + subtle CSS washes). */
const BG_COLOR = "#ffffff";

/** Whole particle field drifts slowly so motion reads on a white canvas. */
function LightSceneDrift({ animate, children }: { animate: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!animate || !g) return;
    const t = state.clock.elapsedTime;
    g.position.x = Math.sin(t * 0.038) * 0.75;
    g.position.y = Math.cos(t * 0.032) * 0.55;
    g.rotation.z = Math.sin(t * 0.018) * 0.004;
  });

  return <group ref={ref}>{children}</group>;
}

/**
 * Light billing backdrop: drifting particles + soft halos (no grid).
 * CSS layers in {@link DigitalLivingBackdrop} add pulse, sweep, and orbit.
 */
export default function LivingLightBackdropScene({ animate }: { animate: boolean }) {
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
      <LightSceneDrift animate={animate}>
        <DriftingDots
          count={14}
          animate={animate}
          color="#bae6fd"
          size={9}
          opacity={0.07}
          spreadXZ={90}
          spreadY={55}
          spreadZ={12}
          amp={2.8}
          zBase={-14}
        />
        <DriftingDots
          count={100}
          animate={animate}
          color="#0891b2"
          size={3.8}
          opacity={0.52}
          spreadXZ={68}
          spreadY={44}
          spreadZ={8}
          amp={2.1}
          zBase={-10}
        />
        <DriftingDots
          count={62}
          animate={animate}
          color="#0e7490"
          size={3.1}
          opacity={0.38}
          spreadXZ={74}
          spreadY={48}
          spreadZ={9}
          amp={1.65}
          zBase={-11}
        />
        <DriftingDots
          count={44}
          animate={animate}
          color="#38bdf8"
          size={2.6}
          opacity={0.3}
          spreadXZ={80}
          spreadY={52}
          spreadZ={10}
          amp={1.2}
          zBase={-12}
        />
        <DriftingDots
          count={20}
          animate={animate}
          color="#f59e0b"
          size={3.1}
          opacity={0.28}
          spreadXZ={86}
          spreadY={56}
          spreadZ={10}
          amp={1.35}
          zBase={-10}
        />
        <DriftingDots
          count={14}
          animate={animate}
          color="#34d399"
          size={2.8}
          opacity={0.22}
          spreadXZ={90}
          spreadY={60}
          spreadZ={11}
          amp={1.15}
          zBase={-11}
        />
      </LightSceneDrift>
    </Canvas>
  );
}
