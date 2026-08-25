import type { Metadata } from "next";
import Link from "next/link";
import { Oswald, JetBrains_Mono, DM_Sans } from "next/font/google";
import HeaderNav from "@/components/layout/HeaderNav";
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
    <html lang="en" className={`${oswald.variable} ${jetbrains.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
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

            <HeaderNav />
          </div>
        </header>

        <main className="mx-auto max-w-[1160px] px-4 pb-20 sm:px-6">{children}</main>

        {/* Footer — minimal: logo mark, Rules / Terms / Categories (brief 3.14) */}
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
            </Link>{" "}
            ·{" "}
            <Link href="/#categories" className="underline decoration-white/15 underline-offset-2 hover:text-paper/50">
              Categories
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
