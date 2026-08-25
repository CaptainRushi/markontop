import type { Metadata } from "next";
import Link from "next/link";
import { Oswald, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-general",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MarkOnTop — Deterministic Paid Placement",
  description:
    "Claim your category's top spot. $1 entry floor. Deterministic paid placement — highest bid holds the rank until outbid.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${jetbrains.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">
        {/* Header — F1 broadcast: tight, high-contrast, hairline */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-track/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1160px] items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="font-display text-[18px] font-black tracking-[-0.02em] text-paper sm:text-[20px]"
              style={{ fontStretch: "condensed" }}
            >
              MARK<span className="text-gold">ONTOP</span>
            </Link>

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
              <Link
                href="/submit"
                className="ml-1 bg-gold px-4 py-1.5 text-[12px] font-black tracking-[0.06em] text-track transition-colors hover:bg-[#ffd24d] sm:px-5 sm:text-[13px]"
              >
                TAKE A SPOT
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-[1160px] px-4 pb-20 sm:px-6">{children}</main>

        {/* Footer — minimal */}
        <footer className="border-t border-white/[0.05] py-8 text-center">
          <p className="mx-auto max-w-xl text-[11px] leading-relaxed tracking-wide text-paper/25">
            MarkOnTop is a deterministic paid-placement advertising service. Placement is purchased, not won.
            No refunds.{" "}
            <Link href="/terms" className="underline decoration-white/15 underline-offset-2 hover:text-paper/50">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/rules" className="underline decoration-white/15 underline-offset-2 hover:text-paper/50">
              Rules
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
