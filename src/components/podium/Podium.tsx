"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Listing } from "@/lib/types";
import PodiumFallback from "./PodiumFallback";

const PodiumScene = dynamic(() => import("./PodiumScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-end justify-center gap-2 bg-track px-4 py-6 sm:h-[360px]">
      {[2, 1, 3].map((r) => (
        <div key={r} className="h-20 w-[30%] max-w-[220px] animate-pulse bg-white/[0.04]" />
      ))}
    </div>
  ),
});

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

export default function Podium({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const [mode, setMode] = useState<"checking" | "webgl" | "fallback">("checking");

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const lowMem = mem !== undefined && mem <= 2;
    // F1 spec: <768 always fallback OR failed WebGL — must be real, not assumed
    if (isMobile || lowMem || !hasWebGL()) setMode("fallback");
    else setMode("webgl");
  }, []);

  if (mode === "fallback") return <PodiumFallback top3={top3} />;

  return (
    <div className="overflow-hidden border border-white/[0.06] bg-track">
      <div className="h-[300px] sm:h-[360px]">
        <PodiumScene top3={top3} />
      </div>
    </div>
  );
}
