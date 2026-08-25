"use client";

import { useState } from "react";
import Link from "next/link";
import BidModal from "@/components/bid/BidModal";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Client component for header navigation — owns BidModal overlay state.
 * Brief 3.1: "Category link + primary CTA ('Take a spot') right."
 * Brief 3.7: "Modal over the current page — never a route change."
 */
export default function HeaderNav() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/my-rank"
          className="px-3 py-1.5 text-[13px] font-medium tracking-wide text-paper/60 transition-colors hover:text-paper"
        >
          My Rank
        </Link>
        <Link
          href="/rules"
          className="hidden px-3 py-1.5 text-[13px] font-medium tracking-wide text-paper/60 transition-colors hover:text-paper sm:inline-block"
        >
          Rules
        </Link>
        <ThemeToggle />
        <button
          onClick={() => setModalOpen(true)}
          className="ml-1 bg-gold px-4 py-1.5 text-[12px] font-black tracking-[0.06em] text-track transition-colors hover:bg-[#ffd24d] sm:px-5 sm:text-[13px]"
        >
          TAKE A SPOT
        </button>
      </nav>

      <BidModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
