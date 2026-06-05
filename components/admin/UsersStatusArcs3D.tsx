/**
 * Users KPI — extruded concentric arc stack (Three.js + R3F) + four 3D canister gauges.
 * Gold hub + four status arcs (active, inactive, expired, expiring). Expired red uses a thinner radial band.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionActive } from "@/lib/motionLifecycle";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

import { HudGroundShadow } from "@/components/dashboard/hud/HudGroundShadow";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/cn";
import { UsersStatusCanisterGauges3D } from "@/components/admin/UsersStatusCanisterGauges3D";
import type { UsersStatusGaugeHrefs } from "@/components/admin/UsersStatusCanisterGauges3D";

export type UsersStatusBeltHrefs = UsersStatusGaugeHrefs;

export type UsersStatusArcs3DProps = {
  /** Denominator for gauge percentages. */
  total: number;
  active: number;
  inactive: number;
  expired: number;
  expiring: number;
  /** When false, expiring count is treated as 0 for the chart. */
  expiringEnabled: boolean;
  /** Optional filter URLs for each gauge column. */
  beltHrefs?: UsersStatusBeltHrefs;
  className?: string;
};

const SECTOR_EXTRUDE_BEVEL = 0.028;

function createAnnularSectorGeometry(
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
  depth: number,
  arcSegments = 56,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const cos = Math.cos;
  const sin = Math.sin;
  shape.moveTo(outerR * cos(startAngle), outerR * sin(startAngle));
  for (let i = 1; i <= arcSegments; i++) {
    const t = startAngle + ((endAngle - startAngle) * i) / arcSegments;
    shape.lineTo(outerR * cos(t), outerR * sin(t));
  }
  for (let i = arcSegments; i >= 0; i--) {
    const t = startAngle + ((endAngle - startAngle) * i) / arcSegments;
    shape.lineTo(innerR * cos(t), innerR * sin(t));
  }
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: SECTOR_EXTRUDE_BEVEL,
    bevelSize: SECTOR_EXTRUDE_BEVEL,
    bevelSegments: 2,
  });
  geom.rotateX(-Math.PI / 2);
  return geom;
}

function ExtrudedSector({
  innerR,
  outerR,
  startAngle,
  endAngle,
  height,
  color,
  emissiveIntensity = 0.12,
}: {
  innerR: number;
  outerR: number;
  startAngle: number;
  endAngle: number;
  height: number;
  color: string;
  emissiveIntensity?: number;
}) {
  const geom = useMemo(
    () => createAnnularSectorGeometry(innerR, outerR, startAngle, endAngle, height),
    [innerR, outerR, startAngle, endAngle, height],
  );

  useEffect(() => {
    return () => {
      geom.dispose();
    };
  }, [geom]);

  const col = useMemo(() => new THREE.Color(color), [color]);

  return (
    <mesh geometry={geom} castShadow receiveShadow position={[0, 0, 0]}>
      <meshPhysicalMaterial
        color={col}
        emissive={col}
        emissiveIntensity={emissiveIntensity}
        metalness={0.42}
        roughness={0.38}
        clearcoat={0.22}
        clearcoatRoughness={0.45}
      />
    </mesh>
  );
}

const COLORS = {
  active: { fill: "#22c55e", em: 0.16 },
  inactive: { fill: "#64748b", em: 0.12 },
  expired: { fill: "#dc2626", em: 0.2 },
  expiring: { fill: "#f97316", em: 0.14 },
} as const;

/** Slightly smaller than 1.0 so arcs stay inside the canvas (no side clip while spinning). */
const SCENE_SCALE = 0.82;

/** Thinner radial shell for expired (red) lip vs main annulus body. */
const RED_RADIAL = 0.41;

type Slice = {
  key: keyof typeof COLORS;
  count: number;
  start: number;
  end: number;
};

function UsersStatusScene3D({
  active,
  inactive,
  expired,
  expiring,
}: {
  active: number;
  inactive: number;
  expired: number;
  expiring: number;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const groupRef = useRef<THREE.Group>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const reduceMotionRef = useRef(false);

  const exp = expiring;
  const sum = Math.max(1, active + inactive + expired + exp);

  const slices: Slice[] = useMemo(() => {
    let a = -Math.PI * 0.65;
    const parts: Array<{ key: keyof typeof COLORS; count: number }> = [
      { key: "active", count: active },
      { key: "inactive", count: inactive },
      { key: "expired", count: expired },
      { key: "expiring", count: exp },
    ];
    const out: Slice[] = [];
    for (const p of parts) {
      const span = (p.count / sum) * Math.PI * 1.92;
      const end = a + span;
      out.push({ key: p.key, count: p.count, start: a, end: end });
      a = end + 0.04;
    }
    return out;
  }, [active, inactive, expired, exp, sum]);

  /** Shared annulus: body inner/outer; red sits in a thin outer lip per its angles only. */
  const innerR = 0.56;
  const outerMain = 1.5;
  const redLipInner = outerMain - RED_RADIAL;

  const hubH = 0.22;
  const hubY = 0.11;

  useEffect(() => {
    const L = sunRef.current;
    if (L) {
      L.shadow.radius = 22;
      L.shadow.normalBias = 0.035;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduceMotionRef.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || reduceMotionRef.current) return;
    groupRef.current.rotation.y += delta * 0.26;
  });

  return (
    <>
      <hemisphereLight args={["#64748b", "#0f172a", 0.55]} />
      <ambientLight intensity={0.36} />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[4.2, 6.5, 4.8]}
        intensity={1.35}
        color="#e2e8f0"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={24}
        shadow-camera-left={-3.2}
        shadow-camera-right={3.2}
        shadow-camera-top={3.2}
        shadow-camera-bottom={-3.2}
        shadow-bias={-0.00025}
      />
      <directionalLight position={[-3.5, 2.2, -2]} intensity={0.55} color="#38bdf8" />
      <pointLight position={[0.2, 3.2, 1.2]} intensity={0.85} color="#fde68a" distance={8} decay={2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 0]} receiveShadow>
        <circleGeometry args={[2.35, 96]} />
        <shadowMaterial transparent opacity={isLight ? 0.36 : 0.78} color="#020617" />
      </mesh>

      <group ref={groupRef} position={[0, 0.02, 0]} scale={SCENE_SCALE}>
        {slices.map((s) => {
          const span = s.end - s.start;
          if (span < 0.02) return null;
          const c = COLORS[s.key];
          const h = s.key === "expired" ? 0.36 : s.key === "active" ? 0.48 : 0.4;
          if (s.key === "expired") {
            return (
              <ExtrudedSector
                key={s.key}
                innerR={redLipInner}
                outerR={outerMain}
                startAngle={s.start}
                endAngle={s.end}
                height={h}
                color={c.fill}
                emissiveIntensity={c.em}
              />
            );
          }
          return (
            <ExtrudedSector
              key={s.key}
              innerR={innerR}
              outerR={redLipInner}
              startAngle={s.start}
              endAngle={s.end}
              height={h}
              color={c.fill}
              emissiveIntensity={c.em}
            />
          );
        })}

        <mesh castShadow receiveShadow position={[0, hubY, 0]}>
          <cylinderGeometry args={[0.42, 0.42, hubH, 48]} />
          <meshPhysicalMaterial
            color="#f59e0b"
            emissive="#fbbf24"
            emissiveIntensity={0.38}
            metalness={0.55}
            roughness={0.32}
            clearcoat={0.35}
          />
        </mesh>
      </group>
    </>
  );
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function UsersStatusArcs3D({
  total,
  active,
  inactive,
  expired,
  expiring,
  expiringEnabled,
  beltHrefs,
  className,
}: UsersStatusArcs3DProps) {
  const exp = expiringEnabled ? expiring : 0;
  const sum = Math.max(0, active + inactive + expired + exp);
  const totalSafe = Math.max(0, total);
  const [canvasReady, setCanvasReady] = useState(false);
  const motionRef = useRef<HTMLDivElement>(null);
  const motionActive = useMotionActive(motionRef);

  useEffect(() => {
    const id = requestAnimationFrame(() => setCanvasReady(true));
    return () => {
      cancelAnimationFrame(id);
      setCanvasReady(false);
    };
  }, []);

  return (
    <div
      ref={motionRef}
      className={cn(
        "@container/users-status-kpi relative isolate flex w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
      role="img"
      aria-label={`3D status arcs: active ${formatInt(active)}, inactive ${formatInt(inactive)}, expired ${formatInt(expired)}, expiring ${formatInt(exp)} of ${formatInt(sum)}. Total ${formatInt(totalSafe)}.`}
    >
      <div
        className={cn(
          "relative isolate mx-auto aspect-[43/25] w-full max-w-[min(100%,clamp(8.75rem,52vw,12.5rem))] shrink-0 cursor-default justify-center overflow-visible px-0.5 pb-0 pt-0 leading-normal",
          "pointer-events-auto transition-[filter] duration-200 ease-out hover:brightness-[1.06]",
          "sm:mx-0 sm:w-auto sm:max-w-[min(42%,clamp(10.5rem,24vw,15rem))]",
          "md:max-w-[min(44%,clamp(11.5rem,22vw,16rem))]",
          "lg:max-w-[min(46%,17.5rem)]",
          "xl:max-w-[min(48%,19rem)]",
          "2xl:max-w-[min(50%,20.5rem)]",
          "self-center",
        )}
      >
        <HudGroundShadow size="md" className="bottom-0" />
        <div className="relative z-[1] mx-auto h-full w-full overflow-visible">
          {canvasReady ? (
            <Canvas
              frameloop={motionActive ? "always" : "never"}
              shadows
              className="!block h-full w-full overflow-visible rounded-sm"
              camera={{ position: [2.95, 1.88, 2.95], fov: 31, near: 0.1, far: 48 }}
              gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
              dpr={[1, 1.5]}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
                gl.shadowMap.enabled = true;
                gl.shadowMap.type = THREE.PCFSoftShadowMap;
              }}
            >
              <UsersStatusScene3D active={active} inactive={inactive} expired={expired} expiring={exp} />
            </Canvas>
          ) : (
            <div className="h-full w-full" aria-hidden />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch sm:min-w-[24rem] md:min-w-[28rem] lg:min-w-[32rem]">
        <UsersStatusCanisterGauges3D
          total={totalSafe}
          active={active}
          inactive={inactive}
          expired={expired}
          expiring={expiring}
          expiringEnabled={expiringEnabled}
          hrefs={beltHrefs}
        />
      </div>
    </div>
  );
}
