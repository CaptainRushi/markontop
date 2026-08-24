"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh, Texture } from "three";
import type { Listing } from "@/lib/types";

// ── Stage geometry ──
// rank -> [x, blockHeight]
const SLOTS: Record<number, [number, number]> = {
  1: [0, 3.0], // center — tallest
  2: [-2.7, 2.1], // left — medium
  3: [2.7, 1.4], // right — shortest
};

// Block face materials use wood/stone tones on ink
const WOOD_DARK = "#1e1a15";
const WOOD_EDGE = "#2e2820";

// Medal trim colors
const MEDAL: Record<number, string> = {
  1: "#C6A15B", // gold
  2: "#ADA79B", // silver
  3: "#A5714A", // bronze
};

// ── Easing — spring-ish overshoot for the signature swap ──
function springEase(t: number): number {
  // pronounced overshoot then settle — physical weight
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c3 + 1) * 2 * t - c3)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c3 + 1) * (t * 2 - 2) + c3) + 2) / 2;
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// ── Texture hook ──
function useBannerTexture(url: string | null): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        if (cancelled) return void t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        setTexture(t);
      },
      undefined,
      () => setTexture(null)
    );
    return () => {
      cancelled = true;
    };
  }, [url]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

// ── Idle camera drift ──
function DriftingCamera() {
  const { camera } = useThree();
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useFrame(({ clock }) => {
    if (prefersReducedMotion) return;
    const t = clock.getElapsedTime();
    // ~75s per rotation, very slow
    const angle = (t / 75) * Math.PI * 2;
    const r = 0.35;
    camera.position.x = Math.sin(angle) * r;
    camera.position.z = 8.5 + Math.cos(angle) * r * 0.3;
    camera.lookAt(0, 1.2, 0);
  });
  return null;
}

// ── Single podium block ──
function PodiumBlock({
  listing,
  rank,
  appearDelay,
}: {
  listing: Listing | null;
  rank: number;
  appearDelay: number;
}) {
  const group = useRef<Group>(null);
  const block = useRef<Mesh>(null);
  const bannerRef = useRef<Mesh>(null);
  const [x, height] = SLOTS[rank];
  const texture = useBannerTexture(listing?.banner_url ?? null);
  const trimColor = MEDAL[rank];
  const hasListing = !!listing;

  // Load-in animation — rise from below
  const [risen, setRisen] = useState(false);
  const riseStart = useRef<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setRisen(true), appearDelay);
    return () => clearTimeout(t);
  }, [appearDelay]);

  // Disappearance / swap state
  const prevListingId = useRef<string | null>(listing?.id ?? null);
  const [swapping, setSwapping] = useState(false);
  const swapProgress = useRef(0);

  useEffect(() => {
    if (prevListingId.current !== (listing?.id ?? null) && prevListingId.current !== null) {
      setSwapping(true);
      swapProgress.current = 0;
      const timer = setTimeout(() => setSwapping(false), 900);
      prevListingId.current = listing?.id ?? null;
      return () => clearTimeout(timer);
    }
    prevListingId.current = listing?.id ?? null;
  }, [listing?.id]);

  const sideMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.7, metalness: 0.05 }),
    []
  );
  const bannerMaterial = useMemo(() => {
    if (texture) {
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.02 });
    }
    return new THREE.MeshStandardMaterial({ color: "#252019", roughness: 0.8, metalness: 0 });
  }, [texture]);

  // Keep banner material map in sync
  useEffect(() => {
    if (texture) (bannerMaterial as THREE.MeshStandardMaterial).map = texture;
    bannerMaterial.needsUpdate = true;
  }, [texture, bannerMaterial]);

  useFrame((state, dt) => {
    const g = group.current;
    const m = block.current;
    const b = bannerRef.current;
    if (!g || !m) return;
    const d = Math.min(dt, 0.1);
    const t = state.clock.getElapsedTime();

    // Horizontal glide to slot — gentle
    g.position.x = damp(g.position.x, x, 5, d);

    // Vertical: rise animation or height lerp
    if (!risen) {
      // below stage
      m.scale.y = damp(m.scale.y, 0.05, 8, d);
      m.position.y = m.scale.y / 2 - 0.8;
      if (b) b.visible = false;
    } else {
      m.scale.y = damp(m.scale.y, height, 6, d);
      // Swap dip: when swapping, block dips down 30% then springs back
      if (swapping) {
        swapProgress.current = Math.min(1, swapProgress.current + d / 0.85);
        const eased = springEase(swapProgress.current);
        // dip curve: 0 -> -0.5 -> 0 with overshoot
        const dip = Math.sin(swapProgress.current * Math.PI) * -0.45;
        m.position.y = m.scale.y / 2 + dip;
        if (b) {
          // banner crossfade — hide during dip
          const mat = b.material as THREE.MeshStandardMaterial;
          mat.opacity = swapping ? Math.max(0, 1 - swapProgress.current * 2.2) : 1;
          mat.transparent = true;
        }
      } else {
        m.position.y = m.scale.y / 2;
        if (b) {
          const mat = b.material as THREE.MeshStandardMaterial;
          mat.opacity = damp(mat.opacity ?? 1, 1, 10, d);
        }
      }
      if (b) b.visible = hasListing;
    }

    void t;
  });

  // Rank numeral — shown on block face when no banner, otherwise subtle
  return (
    <group ref={group} position={[x, -0.6, 0]}>
      {/* Trim cap — medal color */}
      <mesh position={[0, height + 0.04, 0]}>
        <boxGeometry args={[2.15, 0.06, 2.15]} />
        <meshStandardMaterial color={trimColor} roughness={0.35} metalness={0.55} />
      </mesh>

      {/* Main block */}
      <mesh ref={block} position={[0, height / 2, 0]} material={sideMaterial} castShadow receiveShadow>
        <boxGeometry args={[2, 1, 2]} />
      </mesh>

      {/* Banner plane — inset on front face */}
      <mesh
        ref={bannerRef}
        position={[0, height / 2, 1.02]}
        material={bannerMaterial}
        visible={hasListing}
      >
        <planeGeometry args={[1.85, 0.92]} />
      </mesh>

      {/* Rank number ghost when empty */}
      {!hasListing && risen && (
        <group position={[0, height / 2, 1.03]}>
          {/* subtle outline rect to suggest empty slot */}
          <mesh>
            <planeGeometry args={[1.85, 0.92]} />
            <meshBasicMaterial color="#2a2520" transparent opacity={0.55} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ── Scene ──
export default function PodiumScene({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));

  // Staggered rise: 3 first, then 2, then 1 (choreographed)
  const delays: Record<number, number> = { 3: 120, 2: 320, 1: 560 };

  return (
    <Canvas
      camera={{ position: [0, 2.6, 8.5], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      className="!touch-none"
      shadows
    >
      <color attach="background" args={["#16130F"]} />

      {/* Stage lighting — warm overhead spots per block */}
      <ambientLight intensity={0.35} color="#f6f3ec" />
      {/* Key: warm overhead for center */}
      <spotLight
        position={[0, 7, 2]}
        angle={0.42}
        penumbra={0.7}
        intensity={85}
        color="#fff6e0"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight position={[-2.7, 6, 1.5]} angle={0.38} penumbra={0.8} intensity={55} color="#fff6e0" />
      <spotLight position={[2.7, 6, 1.5]} angle={0.38} penumbra={0.8} intensity={45} color="#fff6e0" />
      {/* Fill — cool rim from behind */}
      <directionalLight position={[-4, 3, -5]} intensity={0.18} color="#8a9bb5" />
      {/* Ground bounce */}
      <hemisphereLight args={["#f6f3ec", "#16130f", 0.22]} />

      {/* Stage floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial color="#1c1812" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Hairline stage edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.61, 0]}>
        <planeGeometry args={[18, 0.015]} />
        <meshBasicMaterial color="#C6A15B" transparent opacity={0.18} />
      </mesh>

      {[1, 2, 3].map((rank) => (
        <Suspense key={rank} fallback={<group />}>
          <PodiumBlock rank={rank} listing={byRank.get(rank) ?? null} appearDelay={delays[rank]} />
        </Suspense>
      ))}

      <DriftingCamera />
    </Canvas>
  );
}
