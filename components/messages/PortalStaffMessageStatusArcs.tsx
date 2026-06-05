/**
 * Portal staff messaging KPI — layered 3D rings + dropdown belts.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

import { cn } from "@/lib/cn";
import { useMotionActive } from "@/lib/motionLifecycle";
import { useTheme } from "@/contexts/ThemeContext";
import { HudGroundShadow } from "@/components/dashboard/hud/HudGroundShadow";
import { MessageKpiDropdownBelts } from "@/components/ui/MessageKpiDropdownBelts";
import { MessageKpiCompactList } from "@/components/ui/MessageKpiCompactList";
import {
  buildPortalStaffBeltRows,
  buildPortalStaffChartLayers,
  PORTAL_STAFF_CHART_LAYER_COLORS,
  type PortalStaffChartLayer,
} from "@/lib/messages/portalStaffKpiRows";
import type {
  AdminPortalStaffMessageDashboardStats,
  PortalStaffAudiencePreviewCounts,
  PortalStaffRoleMessageStatus,
} from "@/lib/repos/portalStaffMessages";

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
  isLight = false,
}: {
  innerR: number;
  outerR: number;
  startAngle: number;
  endAngle: number;
  height: number;
  color: string;
  emissiveIntensity?: number;
  isLight?: boolean;
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
    <mesh geometry={geom} castShadow={!isLight} receiveShadow={!isLight} position={[0, 0, 0]}>
      <meshPhysicalMaterial
        color={col}
        emissive={col}
        emissiveIntensity={isLight ? emissiveIntensity * 0.35 : emissiveIntensity}
        metalness={isLight ? 0.2 : 0.42}
        roughness={isLight ? 0.55 : 0.38}
        clearcoat={isLight ? 0.08 : 0.22}
        clearcoatRoughness={0.45}
      />
    </mesh>
  );
}

const SCENE_SCALE = 0.9;
const ARC_START = -Math.PI * 0.65;
const ARC_SPAN_MAX = Math.PI * 1.92;

function layerArcAngles(layer: PortalStaffChartLayer): { start: number; end: number } | null {
  const frac = Math.min(1, Math.max(0, layer.fillPct / 100));
  if (frac <= 0 || layer.count <= 0) return null;
  const span = Math.max(frac * ARC_SPAN_MAX, 0.08);
  return { start: ARC_START, end: ARC_START + span };
}

function PortalStaffLayeredRingScene3D({
  staffStats,
  staffAudience,
  isLight,
}: {
  staffStats: AdminPortalStaffMessageDashboardStats;
  staffAudience: PortalStaffAudiencePreviewCounts;
  isLight: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const reduceMotionRef = useRef(false);

  const layers = useMemo(
    () => buildPortalStaffChartLayers(staffStats, staffAudience),
    [staffAudience, staffStats],
  );

  const hubH = 0.22;
  const hubY = 0.11;
  const hubR = 0.36;

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
    groupRef.current.rotation.y += delta * (isLight ? 0.09 : 0.26);
  });

  return (
    <>
      <hemisphereLight args={["#64748b", "#0f172a", 0.55]} />
      <ambientLight intensity={0.36} />
      <directionalLight
        ref={sunRef}
        castShadow={!isLight}
        position={[4.2, 6.5, 4.8]}
        intensity={isLight ? 1.05 : 1.35}
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

      {!isLight ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 0]} receiveShadow>
          <circleGeometry args={[2.35, 96]} />
          <shadowMaterial transparent opacity={0.62} color="#020617" />
        </mesh>
      ) : null}

      <group rotation={[0.34, 0, 0]}>
        <group ref={groupRef} position={[0, 0.02, 0]} scale={SCENE_SCALE}>
          {layers.map((layer) => {
            const arc = layerArcAngles(layer);
            if (!arc) return null;
            const c = PORTAL_STAFF_CHART_LAYER_COLORS[layer.key];
            return (
              <ExtrudedSector
                key={layer.key}
                innerR={layer.innerR}
                outerR={layer.outerR}
                startAngle={arc.start}
                endAngle={arc.end}
                height={layer.height}
                color={c.fill}
                emissiveIntensity={c.em}
                isLight={isLight}
              />
            );
          })}

          <mesh castShadow={!isLight} receiveShadow={!isLight} position={[0, hubY, 0]}>
            <cylinderGeometry args={[hubR, hubR, hubH, 48]} />
            <meshPhysicalMaterial
              color="#f59e0b"
              emissive="#fbbf24"
              emissiveIntensity={isLight ? 0.14 : 0.38}
              metalness={isLight ? 0.28 : 0.55}
              roughness={isLight ? 0.48 : 0.32}
              clearcoat={isLight ? 0.12 : 0.35}
            />
          </mesh>
        </group>
      </group>
    </>
  );
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export type PortalStaffMessageStatusArcsProps = {
  staffStats: AdminPortalStaffMessageDashboardStats;
  staffAudience: PortalStaffAudiencePreviewCounts;
  staffMessageByRole: PortalStaffRoleMessageStatus[];
  className?: string;
  mobileCompact?: boolean;
};

export function PortalStaffMessageStatusArcs({
  staffStats,
  staffAudience,
  staffMessageByRole,
  className,
  mobileCompact = false,
}: PortalStaffMessageStatusArcsProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const reachable = Math.max(0, staffAudience.all_staff);
  const rows = useMemo(
    () => buildPortalStaffBeltRows(staffStats, staffAudience, staffMessageByRole),
    [staffAudience, staffMessageByRole, staffStats],
  );
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
      className={cn("relative isolate w-full min-w-0", className)}
      role="img"
      aria-label={`Portal staff messaging: ${formatInt(reachable)} reachable, ${formatInt(staffStats.messagesSent)} campaigns, ${formatInt(staffStats.dismissed)} dismissed, ${formatInt(staffStats.pendingDismiss)} pending.`}
    >
      {mobileCompact ? (
        <div className="sm:hidden">
          <MessageKpiCompactList rows={rows} />
        </div>
      ) : null}

      <div
        className={cn(
          "relative isolate w-full min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:gap-4",
          mobileCompact ? "hidden sm:flex" : "flex",
        )}
      >
      <div
        className={cn(
          "relative flex h-[120px] w-full max-w-[11rem] shrink-0 cursor-default flex-col items-center justify-center self-center overflow-visible rounded-lg border border-transparent bg-transparent outline-none sm:h-[132px] sm:w-[11rem] sm:self-start",
          !isLight &&
            "transition-[filter,background-color] duration-200 ease-out hover:brightness-[1.08]",
          "pointer-events-auto",
        )}
      >
        <HudGroundShadow size="sm" className="bottom-0.5" />
        <div className="relative z-[1] pointer-events-none flex h-full w-full items-center justify-center p-0">
          {canvasReady ? (
            <Canvas
              frameloop={motionActive ? "always" : "never"}
              shadows={!isLight}
              className="!block h-full w-full max-h-full max-w-full overflow-visible rounded-sm"
              camera={{ position: [2.85, 1.82, 2.85], fov: 29, near: 0.1, far: 48 }}
              gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
              dpr={[1, 1.5]}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
                gl.shadowMap.enabled = !isLight;
                if (!isLight) gl.shadowMap.type = THREE.PCFSoftShadowMap;
              }}
            >
              <PortalStaffLayeredRingScene3D
                staffStats={staffStats}
                staffAudience={staffAudience}
                isLight={isLight}
              />
            </Canvas>
          ) : (
            <div className="h-full w-full" aria-hidden />
          )}
        </div>
      </div>
      <MessageKpiDropdownBelts rows={rows} className="w-full max-w-none" />
      </div>
    </div>
  );
}