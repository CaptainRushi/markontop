"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Listing } from "@/lib/types";
import PodiumFallback from "./PodiumFallback";

const PodiumScene = dynamic(() => import("./PodiumScene"), {
  ssr: false, // R3F requires the DOM/WebGL — never server-render
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-[var(--panel)]" />,
});

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

/** Picks the 3D scene when WebGL exists; otherwise the HTML/CSS podium. */
export default function Podium({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const [mode, setMode] = useState<"checking" | "webgl" | "fallback">("checking");

  useEffect(() => {
    setMode(hasWebGL() ? "webgl" : "fallback");
  }, []);

  if (mode === "fallback") return <PodiumFallback top3={top3} />;
  return (
    <div className="h-72 overflow-hidden rounded-xl border border-[var(--border)]">
      <PodiumScene top3={top3} />
    </div>
  );
}
