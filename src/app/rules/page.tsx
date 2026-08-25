export const metadata = { title: "Rules — MarkOnTop" };

const RULES = [
  {
    n: 1,
    title: "Minimum bid",
    body: "The minimum entry bid is $1. This places a listing on the board at whatever rank that amount currently buys.",
  },
  {
    n: 2,
    title: "Taking an occupied slot",
    body: "To take a top-3 slot — global or category — currently held by another listing, bid at least $1 more than the current holder's amount. The full bid amount is charged.",
  },
  {
    n: 3,
    title: "Raising your own bid",
    body: "If you already hold a slot and want to raise your own bid, you are only charged the difference between your new bid and your current bid — not the full new amount.",
  },
  {
    n: 4,
    title: "Equal bids",
    body: "If two bids are equal, the earlier bid keeps the higher rank.",
  },
  {
    n: 5,
    title: "No time decay",
    body: "Ranks do not expire or decay over time in the current version of MarkOnTop. A rank is held until a higher bid takes it — there is no scheduled reset.",
  },
  {
    n: 6,
    title: "One listing per URL",
    body: "Each submitted link or handle corresponds to one listing. Submitting the same link again updates your existing bid; it does not create a duplicate listing.",
  },
  {
    n: 7,
    title: "Category is fixed at submission",
    body: "The category a listing is submitted under cannot be changed later. Switching categories requires submitting a new listing with a new bid.",
  },
  {
    n: 8,
    title: "Removed listings",
    body: "If a banner or listing is removed for violating these Rules or the Terms below, no refund is issued and no rank is restored.",
  },
  {
    n: 9,
    title: "All bids are final",
    body: "Once a bid is confirmed and charged, it is non-refundable — this applies whether you are later outbid, your listing is removed for a violation, or you simply change your mind. The one exception: if a technical race condition causes your payment to be charged without successfully securing the rank you bid on, that specific amount is automatically refunded. This is the only refund scenario on the platform, and it is limited to that exact situation.",
  },
  {
    n: 10,
    title: "Bidding is at your own risk",
    body: "MarkOnTop sells paid placement — a rank on the board — and nothing more. It does not guarantee traffic, clicks, sales, or any other business outcome from holding a rank. Money committed to a bid can be lost entirely if you are outbid, since bids are non-refundable per Rule 9. Only bid what you are prepared to lose.",
  },
];

export default function RulesPage() {
  return (
    <div className="-mx-4 -mb-20 bg-paper px-4 py-10 text-track sm:-mx-6 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-[32px] font-black tracking-[-0.02em] text-track sm:text-[40px]" style={{ fontStretch: "condensed" }}>
          Rules
        </h1>
        <p className="mt-2 font-data text-xs tracking-wide text-track/40">Paid placement, plainly stated. No marketing copy.</p>

        <ol className="mt-8 divide-y divide-track/10 border-y border-track/10">
          {RULES.map((r) => (
            <li key={r.n} className="flex gap-4 py-5 sm:gap-5">
              <span className="shrink-0 font-data text-xs font-bold tabular-nums text-track/20">{String(r.n).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-track">
                  {r.n}. {r.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-track/60">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 border-t border-track/10 pt-6 text-center font-data text-[11px] leading-relaxed tracking-wide text-track/25">
          Not legal advice — have a lawyer review before processing real payments.
        </p>
      </div>
    </div>
  );
}
