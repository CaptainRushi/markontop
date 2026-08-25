"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Listing } from "@/lib/types";
import PodiumFallback from "./PodiumFallback";

const PodiumScene = dynamic(() => import("./PodiumScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-end justify-center gap-3 bg-track px-4 py-6 sm:h-[400px]">
      {[2, 1, 3].map((r) => (
        <div key={r} className="h-20 w-[30%] max-w-[240px] animate-pulse rounded-md bg-white/[0.05]" />
      ))}
    </div>
  ),
});

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

export default function Podium({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const [mode, setMode] = useState<"checking" | "webgl" | "fallback">("checking");

  useEffect(() => {
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const lowMem = mem !== undefined && mem <= 2;
    // Only force fallback on actual low-end, not just narrow viewport — high-end phones handle the scene at reduced DPR
    if (lowMem || !hasWebGL()) setMode("fallback");
    else setMode("webgl");
  }, []);

  if (mode === "checking") {
    return <div className="h-[340px] animate-pulse bg-white/[0.02] sm:h-[400px]" aria-hidden />;
  }
  if (mode === "fallback") return <PodiumFallback top3={top3} />;

  return (
    <div className="overflow-hidden border border-white/[0.07] bg-track">
      <div className="h-[360px] sm:h-[420px]">
        <PodiumScene top3={top3} />
      </div>
    </div>
  );
}
