"use client";

import type { Listing } from "@/lib/types";
import PodiumBoard from "./PodiumBoard";

/** 2D podium — premium, fast, renders perfectly on every device. */
export default function Podium({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  return <PodiumBoard top3={top3} />;
}
