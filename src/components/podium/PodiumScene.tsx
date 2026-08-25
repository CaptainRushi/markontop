"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Group, Mesh, Texture } from "three";
import type { Listing } from "@/lib/types";

// ── F1 podium geometry ──
const SLOTS: Record<number, [number, number]> = {
  1: [0, 3.2],
  2: [-2.85, 2.15],
  3: [2.85, 1.45],
};

const RISER_COLOR = "#0f1216";
const MEDAL: Record<number, string> = {
  1: "#FFC72C",
  2: "#C7CDD6",
  3: "#CD7F32",
};

function damp(a: number, b: number, l: number, dt: number) {
  return a + (b - a) * (1 - Math.exp(-l * dt));
}

function useBannerTexture(url: string | null): Texture | null {
  const [tex, setTex] = useState<Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    let dead = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        if (dead) return void t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        setTex(t);
      },
      undefined,
      () => setTex(null)
    );
    return () => {
      dead = true;
    };
  }, [url]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

// ── Sponsor wall — dark plane with logo-grid pattern ──
function SponsorWall() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, 512, 256);
    // subtle grid of placeholder sponsor blocks
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let y = 16; y < 256; y += 42) {
      for (let x = 16; x < 512; x += 72) {
        const w = 48 + ((x * 7) % 16);
        ctx.fillRect(x, y, w, 18);
        // tiny underline
        ctx.fillStyle = "rgba(255,199,44,0.08)";
        ctx.fillRect(x, y + 22, w * 0.6, 1);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
      }
    }
    // faint vertical seams
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let x = 128; x < 512; x += 128) ctx.fillRect(x, 0, 1, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh position={[0, 1.8, -2.2]}>
      <planeGeometry args={[20, 5]} />
      <meshStandardMaterial map={texture} roughness={0.9} metalness={0.02} transparent opacity={0.95} />
    </mesh>
  );
}

// ── Strobe flash plane ──
function StrobeFlash({ active }: { active: boolean }) {
  const ref = useRef<Mesh>(null);
  const opacity = useRef(0);

  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    if (active) {
      // quick double-flash: 0 -> 0.85 -> 0.15 -> 0.7 -> 0
      const t = performance.now() % 600;
      if (t < 60) opacity.current = 0.7;
      else if (t < 120) opacity.current = 0.08;
      else if (t < 180) opacity.current = 0.5;
      else opacity.current = damp(opacity.current, 0, 12, dt);
    } else {
      opacity.current = damp(opacity.current, 0, 14, dt);
    }
    mat.opacity = opacity.current;
  });

  return (
    <mesh ref={ref} position={[0, 1.5, 4]} rotation={[0, 0, 0]}>
      <planeGeometry args={[22, 12]} />
      <meshBasicMaterial color="#F2F5F8" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ── Confetti burst (F1 champagne spray) ──
function ConfettiBurst({ at, trigger }: { at: [number, number, number]; trigger: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!visible) return null;
  return (
    <group position={at}>
      <Sparkles count={55} scale={[1.6, 1.2, 1.2]} size={1.8} speed={0.9} color="#FFC72C" opacity={0.85} />
      <Sparkles count={28} scale={[1.4, 1.0, 1.0]} size={1.2} speed={1.1} color="#F2F5F8" opacity={0.6} />
    </group>
  );
}

// ── Ambient particles — always on, low count ──
function AmbientParticles({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <group>
      <Sparkles count={42} scale={[9, 4, 3]} size={0.7} speed={0.18} color="#FFC72C" opacity={0.28} />
      <Sparkles count={28} scale={[9, 3, 3]} size={0.45} speed={0.12} color="#F2F5F8" opacity={0.18} />
    </group>
  );
}

// ── Single riser ──
function Riser({
  listing,
  rank,
  appearDelay,
  flashKey,
  burstKey,
  reducedMotion,
}: {
  listing: Listing | null;
  rank: number;
  appearDelay: number;
  flashKey: number;
  burstKey: number;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const block = useRef<Mesh>(null);
  const bannerRef = useRef<Mesh>(null);
  const [x, h] = SLOTS[rank];
  const tex = useBannerTexture(listing?.banner_url ?? null);
  const hasListing = !!listing;

  const [risen, setRisen] = useState(reducedMotion);
  const [swapping, setSwapping] = useState(false);
  const swapT = useRef(0);
  const prevId = useRef<string | null>(listing?.id ?? null);

  useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(() => setRisen(true), appearDelay);
    return () => clearTimeout(t);
  }, [appearDelay, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    if (prevId.current !== (listing?.id ?? null) && prevId.current !== null) {
      setSwapping(true);
      swapT.current = 0;
      const timer = setTimeout(() => setSwapping(false), 900);
      prevId.current = listing?.id ?? null;
      return () => clearTimeout(timer);
    }
    prevId.current = listing?.id ?? null;
  }, [listing?.id, reducedMotion]);

  const sideMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: RISER_COLOR, roughness: 0.75, metalness: 0.06 }),
    []
  );
  const topMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1a1e24", roughness: 0.65, metalness: 0.08 }),
    []
  );
  const bannerMat = useMemo(() => {
    if (tex) return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.02 });
    return new THREE.MeshStandardMaterial({ color: "#1a1e24", roughness: 0.85, metalness: 0 });
  }, [tex]);

  useEffect(() => {
    if (tex) (bannerMat as THREE.MeshStandardMaterial).map = tex;
    bannerMat.needsUpdate = true;
  }, [tex, bannerMat]);

  // Number texture for riser face
  const numberTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = RISER_COLOR;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = MEDAL[rank];
    ctx.font = "900 160px Oswald, Barlow Condensed, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // slight emboss
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillText(String(rank), 130, 134);
    ctx.fillStyle = MEDAL[rank];
    ctx.fillText(String(rank), 128, 130);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [rank]);

  const numberMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: numberTex, roughness: 0.6, metalness: 0.12 }),
    [numberTex]
  );

  useFrame((state, dt) => {
    const g = group.current;
    const m = block.current;
    if (!g || !m) return;
    const d = Math.min(dt, 0.08);

    g.position.x = reducedMotion ? x : damp(g.position.x, x, 5, d);

    if (!risen) {
      m.scale.y = damp(m.scale.y, 0.04, 10, d);
      m.position.y = m.scale.y / 2 - 0.9;
      if (bannerRef.current) bannerRef.current.visible = false;
    } else {
      if (swapping && !reducedMotion) {
        swapT.current = Math.min(1, swapT.current + d / 0.82);
        // harder dip for F1 — loser drops visibly
        const dip = Math.sin(swapT.current * Math.PI) * -0.62;
        // overshoot rise
        const overshoot = swapT.current < 0.55 ? 0 : Math.sin((swapT.current - 0.55) * Math.PI * 2.2) * 0.08 * (1 - swapT.current);
        m.scale.y = damp(m.scale.y, h + overshoot, 7, d);
        m.position.y = m.scale.y / 2 + dip;
        if (bannerRef.current) {
          const mat = bannerRef.current.material as THREE.MeshStandardMaterial;
          mat.opacity = Math.max(0, 1 - swapT.current * 2.4);
          mat.transparent = true;
        }
      } else {
        m.scale.y = damp(m.scale.y, h, reducedMotion ? 12 : 6, d);
        m.position.y = m.scale.y / 2;
        if (bannerRef.current) {
          const mat = bannerRef.current.material as THREE.MeshStandardMaterial;
          if (!reducedMotion) mat.opacity = damp(mat.opacity ?? 1, 1, 12, d);
          else mat.opacity = 1;
          bannerRef.current.visible = hasListing;
        }
      }
    }
    void state;
  });

  return (
    <group ref={group} position={[x, -0.62, 0]}>
      {/* Medal top cap */}
      <mesh position={[0, h + 0.03, 0]}>
        <boxGeometry args={[2.12, 0.05, 2.12]} />
        <meshStandardMaterial color={MEDAL[rank]} roughness={0.3} metalness={0.5} emissive={MEDAL[rank]} emissiveIntensity={0.06} />
      </mesh>

      {/* Main riser */}
      <mesh ref={block} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1, 2]} />
        {/* materials: we use side/top/number per face — simplify to sideMat for now, number on front lower */}
        <meshStandardMaterial color={RISER_COLOR} roughness={0.75} metalness={0.06} />
      </mesh>

      {/* Number face — bottom strip of front */}
      <mesh position={[0, 0.28, 1.015]} material={numberMat}>
        <planeGeometry args={[1.9, 0.52]} />
      </mesh>

      {/* Banner plane — upper front */}
      <mesh ref={bannerRef} position={[0, h / 2 + 0.18, 1.02]} material={bannerMat} visible={hasListing}>
        <planeGeometry args={[1.82, 0.88]} />
      </mesh>

      {/* Rim light behind riser — silhouette glow */}
      <pointLight position={[0, h * 0.55, -0.8]} intensity={hasListing ? 18 : 6} color={MEDAL[rank]} distance={3.5} decay={2} />

      {/* Burst particles on rank change */}
      {!reducedMotion && <ConfettiBurst at={[0, h + 0.4, 0.6]} trigger={burstKey} />}
    </group>
  );
}

// ── Drift camera ──
function DriftCam({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    if (!enabled) return;
    const t = clock.getElapsedTime();
    const angle = (t / 76) * Math.PI * 2;
    const r = 0.42;
    camera.position.x = Math.sin(angle) * r;
    camera.position.z = 8.8 + Math.cos(angle) * r * 0.32;
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}

export default function PodiumScene({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Flash + burst triggers
  const [flashActive, setFlashActive] = useState(false);
  const [burstKeys, setBurstKeys] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const prevIds = useRef<Map<number, string | null>>(new Map());

  // Initial ceremony flash + burst on rank 1
  useEffect(() => {
    if (reducedMotion) return;
    const t1 = setTimeout(() => {
      setFlashActive(true);
      setBurstKeys((k) => ({ ...k, 1: 1 }));
    }, 900);
    const t2 = setTimeout(() => setFlashActive(false), 1400);
    const t3 = setTimeout(() => setBurstKeys((k) => ({ ...k, 1: 0 })), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reducedMotion]);

  // Rank-change flash/burst
  useEffect(() => {
    if (reducedMotion) return;
    let changed = false;
    for (const rank of [1, 2, 3] as const) {
      const cur = byRank.get(rank)?.id ?? null;
      const prev = prevIds.current.get(rank) ?? null;
      if (prev !== null && prev !== cur) {
        changed = true;
        const r = rank;
        setBurstKeys((k) => ({ ...k, [r]: (k[r] ?? 0) + 1 }));
      }
      prevIds.current.set(rank, cur);
    }
    if (changed) {
      setFlashActive(true);
      const t = setTimeout(() => setFlashActive(false), 420);
      return () => clearTimeout(t);
    }
  }, [top3, reducedMotion, byRank]);

  const delays: Record<number, number> = { 3: 100, 2: 300, 1: 540 };

  return (
    <Canvas
      camera={{ position: [0, 2.4, 8.8], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      className="!touch-none"
      shadows
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <color attach="background" args={["#0B0D10"]} />

      {/* F1 floods — harder, cooler */}
      <ambientLight intensity={0.28} color="#F2F5F8" />
      <spotLight position={[0, 8, 3]} angle={0.38} penumbra={0.55} intensity={120} color="#FFF8E8" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-3.2, 7, 2]} angle={0.36} penumbra={0.65} intensity={75} color="#E8F0FF" />
      <spotLight position={[3.2, 7, 2]} angle={0.36} penumbra={0.65} intensity={70} color="#E8F0FF" />
      {/* Back rim floods */}
      <spotLight position={[0, 4, -4]} angle={0.9} penumbra={0.8} intensity={45} color="#FFC72C" />
      <directionalLight position={[-5, 3, -5]} intensity={0.22} color="#8aa0c2" />

      <SponsorWall />

      {/* Reflective asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.635, 0]} receiveShadow>
        <planeGeometry args={[22, 12]} />
        <meshStandardMaterial color="#0e1115" roughness={0.32} metalness={0.22} envMapIntensity={0.6} />
      </mesh>
      {/* Gold hairline at stage edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.625, 0]}>
        <planeGeometry args={[22, 0.018]} />
        <meshBasicMaterial color="#FFC72C" transparent opacity={0.22} />
      </mesh>

      {[1, 2, 3].map((rank) => (
        <Suspense key={rank} fallback={<group />}>
          <Riser
            rank={rank}
            listing={byRank.get(rank) ?? null}
            appearDelay={delays[rank]}
            flashKey={flashActive ? 1 : 0}
            burstKey={burstKeys[rank] ?? 0}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      ))}

      <StrobeFlash active={flashActive && !reducedMotion} />
      <AmbientParticles enabled={!reducedMotion} />
      <DriftCam enabled={!reducedMotion} />
    </Canvas>
  );
}
