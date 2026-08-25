"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshReflectorMaterial } from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, Vignette } from "@react-three/postprocessing";
import type { Group, Mesh, Texture } from "three";
import type { Listing } from "@/lib/types";

const SLOTS: Record<number, [number, number]> = {
  1: [0, 3.35],
  2: [-2.95, 2.22],
  3: [2.95, 1.52],
};
const MEDAL: Record<number, string> = { 1: "#FFC72C", 2: "#C7CDD6", 3: "#CD7F32" };

function damp(a: number, b: number, l: number, dt: number) {
  return a + (b - a) * (1 - Math.exp(-l * dt));
}

function useBannerTexture(url: string | null): Texture | null {
  const [tex, setTex] = useState<Texture | null>(null);
  useEffect(() => {
    if (!url) { setTex(null); return; }
    let dead = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, (t) => {
      if (dead) return void t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      setTex(t);
    }, undefined, () => setTex(null));
    return () => { dead = true; };
  }, [url]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

function SponsorWall() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 640; c.height = 320;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0a0d11";
    ctx.fillRect(0, 0, 640, 320);
    // Sponsor blocks — larger, more legible
    ctx.fillStyle = "rgba(255,255,255,0.055)";
    for (let y = 24; y < 300; y += 52) {
      for (let x = 24; x < 620; x += 88) {
        const w = 52 + ((x * 13) % 20);
        ctx.fillRect(x, y, w, 20);
        ctx.fillStyle = "rgba(255,199,44,0.09)";
        ctx.fillRect(x, y + 26, w * 0.55, 1.5);
        ctx.fillStyle = "rgba(255,255,255,0.055)";
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let x = 160; x < 640; x += 160) ctx.fillRect(x, 0, 1, 320);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.6, 1); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh position={[0, 1.9, -2.35]}>
      <planeGeometry args={[24, 6]} />
      <meshStandardMaterial map={tex} roughness={0.92} metalness={0.02} envMapIntensity={0.45} />
    </mesh>
  );
}

function Riser({ listing, rank, delay, reduced }: { listing: Listing | null; rank: number; delay: number; reduced: boolean }) {
  const group = useRef<Group>(null);
  const block = useRef<Mesh>(null);
  const banner = useRef<Mesh>(null);
  const [x, h] = SLOTS[rank];
  const tex = useBannerTexture(listing?.banner_url ?? null);
  const has = !!listing;
  const [risen, setRisen] = useState(reduced);
  const [swapping, setSwapping] = useState(false);
  const swapT = useRef(0);
  const prevId = useRef<string | null>(listing?.id ?? null);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setRisen(true), delay);
    return () => clearTimeout(t);
  }, [delay, reduced]);
  useEffect(() => {
    if (reduced) return;
    if (prevId.current !== (listing?.id ?? null) && prevId.current !== null) {
      setSwapping(true); swapT.current = 0;
      const tm = setTimeout(() => setSwapping(false), 850);
      prevId.current = listing?.id ?? null;
      return () => clearTimeout(tm);
    }
    prevId.current = listing?.id ?? null;
  }, [listing?.id, reduced]);

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#171a1f", metalness: 0.68, roughness: 0.34, envMapIntensity: 1.25 }), []);
  const medalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: MEDAL[rank], metalness: 0.88, roughness: 0.22, envMapIntensity: 1.4 }), [rank]);
  const bannerMat = useMemo(() => tex ? new THREE.MeshStandardMaterial({ map: tex, metalness: 0, roughness: 0.62, envMapIntensity: 0.25 }) : new THREE.MeshStandardMaterial({ color: "#1e2228", roughness: 0.9 }), [tex]);
  useEffect(() => { if (tex) (bannerMat as THREE.MeshStandardMaterial).map = tex; bannerMat.needsUpdate = true; }, [tex, bannerMat]);

  const numTex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#171a1f"; ctx.fillRect(0, 0, 512, 512);
    ctx.font = "900 280px Oswald, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillText(String(rank), 260, 268);
    ctx.fillStyle = MEDAL[rank]; ctx.fillText(String(rank), 256, 262);
    // thin outline
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 3; ctx.strokeText(String(rank), 256, 262);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [rank]);

  useFrame((_, dt) => {
    const g = group.current, m = block.current; if (!g || !m) return;
    const d = Math.min(dt, 0.08);
    g.position.x = reduced ? x : damp(g.position.x, x, 6, d);
    if (!risen) { m.scale.y = damp(m.scale.y, 0.06, 12, d); m.position.y = m.scale.y / 2 - 0.85; if (banner.current) banner.current.visible = false; }
    else if (swapping && !reduced) {
      swapT.current = Math.min(1, swapT.current + d / 0.78);
      const dip = Math.sin(swapT.current * Math.PI) * -0.55;
      m.scale.y = damp(m.scale.y, h, 7, d); m.position.y = m.scale.y / 2 + dip;
      if (banner.current) { const mat = banner.current.material as THREE.MeshStandardMaterial; mat.opacity = Math.max(0, 1 - swapT.current * 2.2); mat.transparent = true; }
    } else {
      m.scale.y = damp(m.scale.y, h, reduced ? 12 : 6, d); m.position.y = m.scale.y / 2;
      if (banner.current) { const mat = banner.current.material as THREE.MeshStandardMaterial; mat.opacity = 1; banner.current.visible = has; }
    }
  });

  return (
    <group ref={group} position={[x, -0.62, 0]}>
      {/* Top medal cap with edge */}
      <mesh position={[0, h + 0.04, 0]}>
        <boxGeometry args={[2.16, 0.07, 2.16]} />
        <meshStandardMaterial color={MEDAL[rank]} roughness={0.26} metalness={0.62} emissive={MEDAL[rank]} emissiveIntensity={0.09} />
      </mesh>
      {/* Body */}
      <mesh ref={block} position={[0, h / 2, 0]} material={bodyMat} castShadow receiveShadow>
        <boxGeometry args={[2.06, 1, 2.06]} />
      </mesh>
      {/* Number inset — large, centered on lower front */}
      <mesh position={[0, 0.42, 1.035]}>
        <planeGeometry args={[1.92, 0.72]} />
        <meshStandardMaterial map={numTex} roughness={0.42} metalness={0.35} transparent opacity={0.96} />
      </mesh>
      {/* Banner frame */}
      {has && (
        <mesh position={[0, h / 2 + 0.32, 1.03]}>
          <planeGeometry args={[1.94, 1.02]} />
          <meshBasicMaterial color="#07090b" />
        </mesh>
      )}
      {/* Banner */}
      <mesh ref={banner} position={[0, h / 2 + 0.32, 1.038]} material={bannerMat} visible={has}>
        <planeGeometry args={[1.86, 0.94]} />
      </mesh>
      {/* Rim glow */}
      <pointLight position={[0, h * 0.5, -0.7]} intensity={has ? 14 : 4} color={MEDAL[rank]} distance={3.2} decay={2} />
    </group>
  );
}

export default function PodiumScene({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delays: Record<number, number> = { 3: 120, 2: 340, 1: 620 };

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.9]}
      camera={{ position: [0, 2.55, 9.2], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      className="!touch-none"
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.32;
        scene.fog = new THREE.FogExp2("#0B0D10", 0.042);
      }}
    >
      <color attach="background" args={["#0B0D10"]} />
      <Environment preset="city" environmentIntensity={1.18} />

      {/* Key + floods */}
      <directionalLight position={[5, 9, 5]} intensity={3.0} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.00035} shadow-camera-near={0.4} shadow-camera-far={24} />
      <spotLight position={[0, 9, 3.5]} angle={0.34} penumbra={0.48} intensity={160} color="#FFF6E8" castShadow shadow-mapSize={[1024, 1024]} decay={1.15} />
      <spotLight position={[-3.4, 7.5, 2.2]} angle={0.32} penumbra={0.58} intensity={88} color="#E8F0FF" />
      <spotLight position={[3.4, 7.5, 2.2]} angle={0.32} penumbra={0.58} intensity={82} color="#E8F0FF" />
      <spotLight position={[0, 4.5, -3.5]} angle={0.85} penumbra={0.75} intensity={55} color="#FFC72C" />
      <ambientLight intensity={0.2} color="#F2F5F8" />

      <SponsorWall />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.635, 0]} receiveShadow>
        <planeGeometry args={[26, 14]} />
        <MeshReflectorMaterial blur={[420, 140]} resolution={1024} mixBlur={0.9} mixStrength={32} roughness={0.24} depthScale={1.15} minDepthThreshold={0.32} maxDepthThreshold={1.4} color="#090c10" metalness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.626, 0]}>
        <planeGeometry args={[26, 0.02]} />
        <meshBasicMaterial color="#FFC72C" transparent opacity={0.24} />
      </mesh>

      {[1, 2, 3].map((rank) => (
        <Suspense key={rank} fallback={<group />}>
          <Riser rank={rank} listing={byRank.get(rank) ?? null} delay={delays[rank]} reduced={reduced} />
        </Suspense>
      ))}

      <EffectComposer enableNormalPass={false}>
        <N8AO intensity={2.4} aoRadius={0.6} quality="performance" />
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.88} intensity={0.68} mipmapBlur radius={0.38} />
        <Vignette eskil={false} offset={0.12} darkness={0.48} />
      </EffectComposer>
    </Canvas>
  );
}
