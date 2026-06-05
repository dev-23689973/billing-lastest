/**
 * Staff hierarchy — extruded multi-ring 3D (Three.js + React Three Fiber).
 * Canvas-only: transparent GL. Numbers live in `StaffHierarchyRibbons` beside this chart
 * so HTML overlays are not clipped by parent overflow.
 */

"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";

import { HudGroundShadow } from "@/components/dashboard/hud/HudGroundShadow";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/cn";
import { useMotionActive } from "@/lib/motionLifecycle";
import type { StaffHubFilterHrefs, StaffRoleFilter } from "@/lib/adminStaffHubFilters";
import { staffRoleFromChartKey, type StaffChartRoleKey } from "@/lib/adminStaffHubFilters";

export type StaffRadialBarChart3DProps = {
  totalStaff: number;
  managers: number;
  resellers: number;
  dealers: number;
  filterHrefs?: StaffHubFilterHrefs;
  activeType?: StaffRoleFilter;
  className?: string;
  hideManagers?: boolean;
  hideResellers?: boolean;
};

const ROLE_ORDER = ["managers", "resellers", "dealers"] as const;
type StaffRoleKey = (typeof ROLE_ORDER)[number];

const ROLE_COLORS = {
  managers: { fill: "#7c3aed", line: "#c4b5fd", glow: "#a78bfa" },
  resellers: { fill: "#06b6d4", line: "#67e8f9", glow: "#22d3ee" },
  dealers: { fill: "#f43f5e", line: "#fda4af", glow: "#fb7185" },
} as const;

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function pctOf(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

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

type RoleEntry = { key: StaffRoleKey; count: number; fill: string; line: string };

function buildRoleEntries(
  managers: number,
  resellers: number,
  dealers: number,
  hideManagers = false,
  hideResellers = false,
): RoleEntry[] {
  const raw = (
    [
      { key: "managers" as const, count: managers, fill: ROLE_COLORS.managers.fill, line: ROLE_COLORS.managers.line },
      { key: "resellers" as const, count: resellers, fill: ROLE_COLORS.resellers.fill, line: ROLE_COLORS.resellers.line },
      { key: "dealers" as const, count: dealers, fill: ROLE_COLORS.dealers.fill, line: ROLE_COLORS.dealers.line },
    ] satisfies RoleEntry[]
  ).filter(
    (e) =>
      e.count > 0 &&
      !(hideManagers && e.key === "managers") &&
      !(hideResellers && e.key === "resellers"),
  );
  return [...raw].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return ROLE_ORDER.indexOf(a.key) - ROLE_ORDER.indexOf(b.key);
  });
}

function ExtrudedSector({
  innerR,
  outerR,
  startAngle,
  endAngle,
  height,
  color,
  emissiveIntensity = 0.12,
  onSelect,
}: {
  innerR: number;
  outerR: number;
  startAngle: number;
  endAngle: number;
  height: number;
  color: string;
  emissiveIntensity?: number;
  onSelect?: () => void;
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
    <mesh
      geometry={geom}
      castShadow
      receiveShadow
      position={[0, 0, 0]}
      onClick={
        onSelect
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
      onPointerOver={
        onSelect
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        onSelect
          ? () => {
              document.body.style.cursor = "";
            }
          : undefined
      }
    >
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

/** Fits annulus inside canvas — paired with camera distance/fov (smaller = no edge clip). */
const SCENE_SCALE = 0.42;

/** Canvas display size — wrapper matches these so no dead margin beside the WebGL view. */
const CHART_WIDTH_PX = 104;
const CHART_HEIGHT_PX = 78;

const SECTOR_RADII = [
  { innerR: 0.98, outerR: 1.88, height: 0.52 },
  { innerR: 0.48, outerR: 0.9, height: 0.34 },
  { innerR: 0.46, outerR: 0.86, height: 0.2 },
] as const;

function StaffScene3D({
  totalStaff,
  managers,
  resellers,
  dealers,
  filterHrefs,
  hideManagers = false,
  hideResellers = false,
}: {
  totalStaff: number;
  managers: number;
  resellers: number;
  dealers: number;
  filterHrefs?: StaffHubFilterHrefs;
  hideManagers?: boolean;
  hideResellers?: boolean;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const groupRef = useRef<THREE.Group>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const reduceMotionRef = useRef(false);
  const hasData = totalStaff > 0;
  const sorted = useMemo(
    () => buildRoleEntries(managers, resellers, dealers, hideManagers, hideResellers),
    [managers, resellers, dealers, hideManagers, hideResellers],
  );

  const layout = useMemo(() => {
    if (!hasData || sorted.length === 0) return null;
    const theta = 2.05;
    const sweep = (count: number) => {
      const frac = Math.min(1, Math.max(0, count / totalStaff));
      return frac * Math.PI * 2 * 0.99;
    };

    const sectors = sorted.map((entry, i) => {
      const ri = SECTOR_RADII[Math.min(i, SECTOR_RADII.length - 1)];
      const s = sweep(entry.count);
      const opposite = sorted.length === 3 && i === sorted.length - 1;
      return {
        ...entry,
        innerR: ri.innerR,
        outerR: ri.outerR,
        height: ri.height,
        start: opposite ? theta + Math.PI - s / 2 : theta - s / 2,
        end: opposite ? theta + Math.PI + s / 2 : theta + s / 2,
      };
    });

    return { sectors };
  }, [hasData, sorted, totalStaff]);

  const hubH = hasData ? 0.24 : 0.2;
  const hubY = 0.12;

  const navigateFilter = (href: string) => {
    requestAnimationFrame(() => {
      router.replace(href, { scroll: false });
    });
  };

  const sectorSelect = (roleKey: StaffChartRoleKey) => {
    if (!filterHrefs) return undefined;
    const role = staffRoleFromChartKey(roleKey);
    return () => navigateFilter(filterHrefs[role]);
  };

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
    groupRef.current.rotation.y += delta * 0.29;
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
        <circleGeometry args={[0.92, 48]} />
        <shadowMaterial transparent opacity={isLight ? 0.36 : 0.78} color="#020617" />
      </mesh>

      <group ref={groupRef} position={[0, 0.02, 0]} scale={SCENE_SCALE}>
        {layout?.sectors.map((sec) => (
          <ExtrudedSector
            key={sec.key}
            innerR={sec.innerR}
            outerR={sec.outerR}
            startAngle={sec.start}
            endAngle={sec.end}
            height={sec.height}
            color={sec.fill}
            emissiveIntensity={sec.key === "managers" ? 0.18 : sec.key === "resellers" ? 0.16 : 0.14}
            onSelect={sectorSelect(sec.key)}
          />
        ))}

        {!hasData && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
            <ringGeometry args={[0.72, 1.12, 48]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.75} />
          </mesh>
        )}

        <mesh
          castShadow
          receiveShadow
          position={[0, hubY, 0]}
          onClick={
            filterHrefs
              ? (e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  navigateFilter(filterHrefs.all);
                }
              : undefined
          }
          onPointerOver={
            filterHrefs
              ? (e: ThreeEvent<PointerEvent>) => {
                  e.stopPropagation();
                  document.body.style.cursor = "pointer";
                }
              : undefined
          }
          onPointerOut={
            filterHrefs
              ? () => {
                  document.body.style.cursor = "";
                }
              : undefined
          }
        >
          <cylinderGeometry args={[0.44, 0.44, hubH, 48]} />
          <meshPhysicalMaterial
            color="#f59e0b"
            emissive="#fbbf24"
            emissiveIntensity={0.35}
            metalness={0.55}
            roughness={0.32}
            clearcoat={0.35}
          />
        </mesh>
      </group>
    </>
  );
}

export function StaffRadialBarChart3D({
  totalStaff,
  managers,
  resellers,
  dealers,
  filterHrefs,
  activeType,
  className,
  hideManagers = false,
  hideResellers = false,
}: StaffRadialBarChart3DProps) {
  const mPct = Math.round(pctOf(managers, totalStaff));
  const rPct = Math.round(pctOf(resellers, totalStaff));
  const dPct = Math.round(pctOf(dealers, totalStaff));
  const motionRef = useRef<HTMLDivElement>(null);
  const motionActive = useMotionActive(motionRef);

  return (
    <div
      ref={motionRef}
      className={cn(
        "relative isolate shrink-0 overflow-visible leading-normal",
        className,
      )}
      style={{ width: CHART_WIDTH_PX, height: CHART_HEIGHT_PX }}
      role="img"
      aria-label={`3D staff share by role; total ${formatInt(totalStaff)}, managers ${mPct}%, resellers ${rPct}%, dealers ${dPct}%. See ribbon labels for formatted counts.`}
    >
      <HudGroundShadow size="md" className="bottom-0" />
      <div
        className="relative z-[1] overflow-hidden"
        style={{ width: CHART_WIDTH_PX, height: CHART_HEIGHT_PX }}
      >
        <Canvas
          frameloop={motionActive ? "always" : "never"}
          shadows
          className="!block overflow-hidden rounded-sm"
          style={{ width: CHART_WIDTH_PX, height: CHART_HEIGHT_PX, display: "block" }}
          camera={{ position: [2.92, 1.78, 2.92], fov: 25, near: 0.1, far: 32 }}
          gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
        >
          <Suspense fallback={null}>
            <StaffScene3D
              totalStaff={totalStaff}
              managers={managers}
              resellers={resellers}
              dealers={dealers}
              filterHrefs={filterHrefs}
              hideManagers={hideManagers}
              hideResellers={hideResellers}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
