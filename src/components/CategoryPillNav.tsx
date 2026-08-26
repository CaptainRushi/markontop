"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export default function CategoryPillNav({ activeSlug }: { activeSlug?: string }) {
  const items = [{ slug: "", name: "All" }, ...CATEGORIES];
  const scrollerRef = useRef<HTMLElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    // ensure active pill is visible on mount
    const active = el.querySelector('[aria-current="page"]') as HTMLElement | null;
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" as ScrollBehavior });
    // re-check after fonts load
    const id = setTimeout(update, 300);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
      clearTimeout(id);
    };
  }, [update, activeSlug]);

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-4 sm:mx-0">
      {/* edge fades — indicate overflow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-track to-transparent transition-opacity duration-200 sm:w-10 ${canLeft ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-track to-transparent transition-opacity duration-200 sm:w-10 ${canRight ? "opacity-100" : "opacity-0"}`}
      />

      {canLeft && (
        <button
          aria-label="Scroll categories left"
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-track/90 text-paper/60 shadow-[0_4px_12px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:bg-white/[0.06] hover:text-paper sm:flex"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}
      {canRight && (
        <button
          aria-label="Scroll categories right"
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-track/90 text-paper/60 shadow-[0_4px_12px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:bg-white/[0.06] hover:text-paper sm:flex"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      <nav
        ref={scrollerRef as React.RefObject<HTMLElement>}
        aria-label="Categories"
        className="scrollbar-none flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth px-4 sm:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((c) => {
          const active = (c.slug || "") === (activeSlug ?? "");
          return (
            <Link
              key={c.slug || "all"}
              href={c.slug ? `/c/${c.slug}` : "/"}
              aria-current={active ? "page" : undefined}
              className={`relative shrink-0 snap-center whitespace-nowrap px-3 py-2.5 text-[12px] font-medium tracking-wide transition-colors sm:px-3.5 sm:text-[13px] ${
                active ? "text-gold" : "text-paper/40 hover:text-paper/75"
              }`}
            >
              {c.name}
              {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold sm:left-3.5 sm:right-3.5" aria-hidden />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
