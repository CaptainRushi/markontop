"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function CategoryPillNav({ activeSlug }: { activeSlug?: string }) {
  const items = [{ slug: "", name: "All" }, ...CATEGORIES];

  return (
    <nav aria-label="Categories" className="scrollbar-none -mx-4 flex gap-0 overflow-x-auto px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
      {items.map((c) => {
        const active = (c.slug || "") === (activeSlug ?? "");
        return (
          <Link
            key={c.slug || "all"}
            href={c.slug ? `/c/${c.slug}` : "/"}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 whitespace-nowrap px-3 py-2.5 text-[12px] font-medium tracking-wide transition-colors sm:px-3.5 sm:text-[13px] ${
              active ? "text-gold" : "text-paper/40 hover:text-paper/75"
            }`}
          >
            {c.name}
            {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold sm:left-3.5 sm:right-3.5" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
