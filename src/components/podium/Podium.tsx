"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Listing } from "@/lib/types";
import PodiumFallback from "./PodiumFallback";

const PodiumScene = dynamic(() => import("./PodiumScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-end justify-center gap-2 bg-ink px-4 py-6 sm:h-[340px]">
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
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function isLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined && mem <= 2) return true;
  // small viewport + low DPR often means mid-range mobile
  if (typeof window !== "undefined" && window.innerWidth < 400 && window.devicePixelRatio <= 2) return false;
  return false;
}

export default function Podium({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const [mode, setMode] = useState<"checking" | "webgl" | "fallback">("checking");

  useEffect(() => {
    if (!hasWebGL() || isLowEnd()) setMode("fallback");
    else setMode("webgl");
  }, []);

  if (mode === "fallback") return <PodiumFallback top3={top3} />;

  return (
    <div className="overflow-hidden border border-white/[0.06] bg-ink">
      <div className="h-[280px] sm:h-[340px]">
        <PodiumScene top3={top3} />
      </div>
    </div>
  );
}
