"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion, useTabVisible } from "@/lib/motionLifecycle";

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function TriPanelOpsMark({ animate }: { animate: boolean }) {
  const root = useRef<THREE.Group>(null);
  const dial = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.Mesh>(null);
  const panelScan = useRef<THREE.Mesh>(null);
  const bars = useRef<THREE.Group>(null);
  const nodes = useRef<THREE.Group>(null);
  const sparks = useRef<THREE.Group>(null);

  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#061026",
        metalness: 0.22,
        roughness: 0.72,
      }),
    [],
  );

  const edgeCyan = useMemo(() => new THREE.Color("#22d3ee"), []);
  const edgeViolet = useMemo(() => new THREE.Color("#a855f7"), []);

  const hudMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#22d3ee"),
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  const sweepMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#a855f7"),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  const scanMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#22d3ee"),
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useFrame((state, dt) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;

    if (animate) {
      root.current.rotation.y = Math.sin(t * 0.55) * 0.18;
      root.current.rotation.x = Math.sin(t * 0.8) * 0.1;
      root.current.position.y = Math.sin(t * 1.05) * 0.03;
    }

    if (dial.current) {
      if (animate) dial.current.rotation.z += dt * 0.5;
    }

    if (sweep.current) {
      if (animate) {
        sweep.current.rotation.z = t * 1.2;
        sweepMat.opacity = 0.1 + (Math.sin(t * 2.0) * 0.5 + 0.5) * 0.18;
      } else {
        sweepMat.opacity = 0.12;
      }
    }

    if (panelScan.current) {
      if (animate) {
        panelScan.current.position.y = -0.32 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.64;
        scanMat.opacity = 0.05 + (Math.sin(t * 2.6) * 0.5 + 0.5) * 0.1;
      } else {
        scanMat.opacity = 0.06;
      }
    }

    if (bars.current) {
      const p = animate ? clamp01(Math.sin(t * 1.4) * 0.5 + 0.5) : 0.4;
      bars.current.children.forEach((child, i) => {
        const m = child as THREE.Mesh;
        m.scale.y = 0.85 + (p * 0.35) * (0.6 + i * 0.14);
      });
    }

    if (nodes.current && animate) {
      nodes.current.rotation.z = Math.sin(t * 0.9) * 0.22;
    }

    if (sparks.current && animate) {
      sparks.current.rotation.y += dt * 0.35;
      sparks.current.rotation.z = Math.sin(t * 0.8) * 0.12;
    }
  });

  return (
    <group ref={root}>
      {/* Three “file/panel” slabs (billing management) */}
      <group position={[0, 0.02, 0]} rotation={[0.18, -0.18, 0.04]}>
        {/* Unified scan slab across the stack (adds “pro HUD” complexity) */}
        <mesh ref={panelScan} position={[0.02, 0, 0.14]} material={scanMat}>
          <boxGeometry args={[1.18, 0.05, 0.01]} />
        </mesh>

        <group position={[-0.16, 0.02, 0.06]} rotation={[0, 0.08, -0.04]}>
          <mesh material={panelMat}>
            <boxGeometry args={[0.62, 0.9, 0.1]} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.62, 0.9, 0.1]} />
            <meshBasicMaterial transparent opacity={0} />
            <Edges color={edgeCyan} threshold={12} />
          </mesh>
          {/* Receipt tear line */}
          <mesh position={[0, -0.44, 0.06]} material={hudMat}>
            <boxGeometry args={[0.56, 0.03, 0.01]} />
          </mesh>
          {/* Ledger lines */}
          <group position={[-0.14, 0.22, 0.06]}>
            {[0.16, 0.04, -0.08, -0.2].map((y, idx) => (
              <mesh key={idx} position={[0, y, 0]}>
                <boxGeometry args={[0.36 - idx * 0.04, 0.022, 0.01]} />
                <meshBasicMaterial color={idx % 2 === 0 ? "#22d3ee" : "#5eead4"} transparent opacity={0.18} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>

        <group position={[0.02, 0.0, 0.02]} rotation={[0, -0.02, 0.02]}>
          <mesh material={panelMat}>
            <boxGeometry args={[0.68, 0.98, 0.11]} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.68, 0.98, 0.11]} />
            <meshBasicMaterial transparent opacity={0} />
            <Edges color={edgeViolet} threshold={12} />
          </mesh>

          {/* Management dashboard bars */}
          <group ref={bars} position={[-0.22, -0.28, 0.07]}>
            {[
              { x: 0, h: 0.18, c: "#5eead4", o: 0.55 },
              { x: 0.14, h: 0.26, c: "#22d3ee", o: 0.7 },
              { x: 0.28, h: 0.14, c: "#a855f7", o: 0.52 },
              { x: 0.42, h: 0.32, c: "#0ea5e9", o: 0.78 },
            ].map((b, i) => (
              <mesh key={i} position={[b.x, b.h / 2, 0]}>
                <boxGeometry args={[0.055, b.h, 0.01]} />
                <meshBasicMaterial color={b.c} transparent opacity={b.o} toneMapped={false} />
              </mesh>
            ))}
          </group>
          <mesh position={[0, -0.36, 0.07]} material={hudMat}>
            <boxGeometry args={[0.6, 0.02, 0.01]} />
          </mesh>
        </group>

        <group position={[0.2, -0.03, -0.05]} rotation={[0, -0.12, 0.06]}>
          <mesh material={panelMat}>
            <boxGeometry args={[0.56, 0.84, 0.09]} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.56, 0.84, 0.09]} />
            <meshBasicMaterial transparent opacity={0} />
            <Edges color={edgeCyan} threshold={12} />
          </mesh>

          {/* Approval check */}
          <mesh position={[-0.18, -0.22, 0.06]}>
            <circleGeometry args={[0.055, 18]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.16} toneMapped={false} />
          </mesh>
          <mesh position={[-0.18, -0.22, 0.07]} rotation={[0, 0, -0.25]}>
            <boxGeometry args={[0.055, 0.012, 0.01]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} toneMapped={false} />
          </mesh>
          <mesh position={[-0.155, -0.235, 0.07]} rotation={[0, 0, 0.9]}>
            <boxGeometry args={[0.036, 0.012, 0.01]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* Ops dial (management) */}
      <group ref={dial} position={[0.34, 0.34, 0.08]} rotation={[Math.PI / 2, 0.2, 0]}>
        <mesh>
          <ringGeometry args={[0.12, 0.18, 36]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={sweep} material={sweepMat} position={[0, 0, 0.001]}>
          <boxGeometry args={[0.02, 0.16, 0.01]} />
        </mesh>
      </group>

      {/* Network nodes (workflow/automation) */}
      <group ref={nodes} position={[-0.34, 0.32, 0.02]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.75} toneMapped={false} />
        </mesh>
        <mesh position={[0.18, -0.08, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.65} toneMapped={false} />
        </mesh>
        <mesh position={[-0.14, -0.16, 0]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshBasicMaterial color="#5eead4" transparent opacity={0.6} toneMapped={false} />
        </mesh>
        <mesh position={[0.02, -0.08, 0]} material={hudMat}>
          <boxGeometry args={[0.22, 0.01, 0.01]} />
        </mesh>
        <mesh position={[-0.06, -0.12, 0]} rotation={[0, 0, 1.05]} material={hudMat}>
          <boxGeometry args={[0.16, 0.01, 0.01]} />
        </mesh>
      </group>

      {/* Micro “sparks” (gaming polish, stays inside safe area) */}
      <group ref={sparks} position={[0.0, 0.02, 0.06]}>
        <mesh position={[0.52, 0.12, 0]} rotation={[0.2, 0.4, 0]}>
          <boxGeometry args={[0.12, 0.01, 0.01]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.22} toneMapped={false} />
        </mesh>
        <mesh position={[-0.48, -0.06, 0.02]} rotation={[-0.1, 0.2, -0.2]}>
          <boxGeometry args={[0.1, 0.01, 0.01]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.18} toneMapped={false} />
        </mesh>
        <mesh position={[0.12, 0.46, -0.02]} rotation={[0.1, -0.1, 0.25]}>
          <boxGeometry args={[0.08, 0.01, 0.01]} />
          <meshBasicMaterial color="#5eead4" transparent opacity={0.16} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

const scaleBySize: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 0.92,
  md: 1.02,
  lg: 1.16,
  xl: 1.32,
};

export function LivingBillingLogoCanvas({
  size,
  active = true,
}: {
  size: "sm" | "md" | "lg" | "xl";
  active?: boolean;
}) {
  const s = scaleBySize[size];
  const reduce = useReducedMotion();
  const tabVisible = useTabVisible();
  const isCompact = size === "sm" || size === "md";
  const runLoop = active && tabVisible && !reduce;

  return (
    <Canvas
      frameloop={runLoop ? "always" : "never"}
      camera={{ position: [2.05, 1.42, 2.35], fov: 36, near: 0.1, far: 30 }}
      className="living-billing-canvas"
      gl={{
        alpha: true,
        antialias: !isCompact,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      dpr={isCompact ? [1, 1.25] : [1, 1.75]}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.NoToneMapping;
      }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <ambientLight intensity={0.95} />
      <directionalLight position={[2.2, 3.4, 2.2]} intensity={0.95} />
      <pointLight position={[-2.6, 1.2, 2]} intensity={0.6} color="#22d3ee" />
      <pointLight position={[2.4, 0.6, -2]} intensity={0.45} color="#a855f7" />
      <group scale={s}>
        <TriPanelOpsMark animate={!reduce} />
      </group>
    </Canvas>
  );
}

