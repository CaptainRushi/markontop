import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Rocket } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarkOnTop — Deterministic Paid Placement",
  description:
    "Claim your category's top spot. $1 entry floor. Deterministic paid placement — highest bid holds the rank until outbid.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Trophy className="h-5 w-5 text-[var(--gold)]" aria-hidden />
              Mark<span className="gold-text">OnTop</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm sm:gap-4">
              <Link href="/my-rank" className="rounded-md px-3 py-1.5 text-neutral-300 hover:text-white">
                My Rank
              </Link>
              <Link href="/rules" className="hidden rounded-md px-3 py-1.5 text-neutral-300 hover:text-white sm:block">
                Rules
              </Link>
              <Link
                href="/submit"
                className="flex items-center gap-1.5 rounded-md bg-[var(--gold)] px-3 py-1.5 font-semibold text-black hover:brightness-110"
              >
                <Rocket className="h-4 w-4" aria-hidden />
                Get on the board
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-neutral-500">
          <p>
            MarkOnTop is a deterministic paid-placement advertising service. Placement is purchased, not won.
            No refunds.{" "}
            <Link href="/terms" className="underline hover:text-neutral-300">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/rules" className="underline hover:text-neutral-300">
              Rules
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
