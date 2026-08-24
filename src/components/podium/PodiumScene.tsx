"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh, Texture } from "three";
import type { Listing } from "@/lib/types";

/**
 * 3D Top-3 podium.
 *  Slots: center = rank 1 (tallest), left = rank 2, right = rank 3.
 *  Banner images are loaded as textures onto the FRONT face (+z) of each block.
 *  When realtime updates reorder the board, blocks glide smoothly to their new
 *  slot using critically-damped interpolation in useFrame (zero extra deps).
 */

// rank -> [x, blockHeight]
const SLOTS: Record<number, [number, number]> = {
  1: [0, 3.0], // center, tallest
  2: [-2.7, 2.1], // left, medium
  3: [2.7, 1.4], // right, shortest
};

const BLOCK_COLOR = "#1b1b29";

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Load a banner URL into a THREE texture without suspending. */
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

function PodiumBlock({ listing, rank }: { listing: Listing | null; rank: number }) {
  const group = useRef<Group>(null);
  const block = useRef<Mesh>(null);
  const [x, height] = SLOTS[rank];
  const texture = useBannerTexture(listing?.banner_url ?? null);

  // BoxGeometry material order: +x, -x, +y, -y, +z (front), -z
  const materials = useMemo(() => {
    const side = () =>
      new THREE.MeshStandardMaterial({ color: BLOCK_COLOR, roughness: 0.55, metalness: 0.15 });
    const front = texture
      ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.05 })
      : side();
    return [side(), side(), side(), side(), front, side()];
  }, [texture]);

  useFrame((_, dt) => {
    const g = group.current;
    const m = block.current;
    if (!g || !m) return;
    const d = Math.min(dt, 0.1);
    g.position.x = damp(g.position.x, x, 6, d);
    m.scale.y = damp(m.scale.y, height, 6, d);
    m.position.y = m.scale.y / 2;
  });

  return (
    <group ref={group} position={[x, 0, 0]}>
      {/* gold trim cap */}
      <mesh position={[0, height + 0.04, 0]}>
        <boxGeometry args={[2.15, 0.08, 2.15]} />
        <meshStandardMaterial color="#f5b83d" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh ref={block} position={[0, height / 2, 0]} material={materials} castShadow>
        <boxGeometry args={[2, 1, 2]} />
      </mesh>
    </group>
  );
}

export default function PodiumScene({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));
  return (
    <Canvas camera={{ position: [0, 2.4, 8.5], fov: 42 }} dpr={[1, 2]} className="!touch-none">
      <color attach="background" args={["#0b0b14"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 8, 6]} intensity={1.4} />
      <directionalLight position={[-5, 4, -4]} intensity={0.35} color="#8899ff" />
      {[1, 2, 3].map((rank) => (
        <Suspense key={rank} fallback={<group />}>
          <PodiumBlock key={rank} rank={rank} listing={byRank.get(rank) ?? null} />
        </Suspense>
      ))}
    </Canvas>
  );
}
