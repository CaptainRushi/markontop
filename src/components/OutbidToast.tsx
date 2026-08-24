"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export interface OutbidEvent {
  id: string;
  title: string;
  takenRank: number;
  amount: number;
}

export default function OutbidToast({ event, onDismiss }: { event: OutbidEvent | null; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 7000);
      return () => clearTimeout(t);
    }
  }, [event, onDismiss]);

  if (!event) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm transition-all duration-300 sm:left-auto sm:right-6 sm:max-w-[380px] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3 border-l-2 border-auction-red bg-paper px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight text-ink">
            You&apos;ve been outbid.
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink/60">
            {event.title} took #{event.takenRank} for{" "}
            <span className="font-data font-bold text-ink">${event.amount.toFixed(2)}</span>.{" "}
            <Link href="/my-rank" className="font-medium text-auction-red underline underline-offset-2">
              Rebid to reclaim it.
            </Link>
          </p>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 300);
          }}
          aria-label="Dismiss"
          className="shrink-0 p-1 text-ink/30 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
