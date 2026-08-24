"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

/** Category switcher — "All" plus the 10 fixed boards. */
export default function CategorySwitcher({ activeSlug }: { activeSlug?: string }) {
  const items = [{ slug: "", name: "All Categories" }, ...CATEGORIES];
  return (
    <nav aria-label="Categories" className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
      {items.map((c) => {
        const isActive = (c.slug || "") === (activeSlug ?? "");
        return (
          <Link
            key={c.slug || "all"}
            href={c.slug ? `/c/${c.slug}` : "/"}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              isActive
                ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                : "border-[var(--border)] text-neutral-400 hover:border-neutral-600 hover:text-white"
            }`}
          >
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
