export const metadata = { title: "Board Rules — MarkOnTop" };

const RULES: Array<[string, string]> = [
  ["Entry floor", "A $1.00 placement places your listing on the board at the rank matching your paid amount. This is a purchase of advertising placement, not a contest entry."],
  ["Deterministic ordering", "Boards are ordered strictly by paid amount, highest first. If two placements have the same amount, the one paid earlier holds the higher rank. No randomness exists anywhere in ranking."],
  ["Taking an occupied slot", "To claim any occupied rank you must place at least $1.00 above the current holder's amount and pay the full amount. The previous holder moves down one rank automatically."],
  ["Raising your own bid", "Re-submitting for a URL you already own charges only the difference between your new total and your current amount."],
  ["One listing per URL", "Each target URL can hold exactly one listing platform-wide. Duplicate submissions for the same URL are merged into an upgrade, not a second listing."],
  ["Category is permanent", "The category you select at submission is fixed. Changing categories requires a new listing with a different URL."],
  ["No time decay", "Your rank does not expire or decay. You hold it until someone pays more to take it."],
  ["No refunds", "All placement payments are final and non-refundable — including if your listing is removed for rule violations or if you are outbid."],
  ["Prohibited listings", "Gambling, adult content, illegal goods or services, scams, malware, hate speech, and anything our payment processors prohibit will be removed without refund."],
];

export default function RulesPage() {
  return (
    <div className="-mx-4 -mb-20 bg-paper px-4 py-10 text-ink sm:-mx-6 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-[32px] font-black tracking-[-0.02em] text-ink sm:text-[40px]">Board Rules</h1>
        <p className="mt-2 font-data text-xs tracking-wide text-ink/40">How deterministic paid placement works.</p>

        <ol className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
          {RULES.map(([title, body], i) => (
            <li key={title} className="flex gap-4 py-5 sm:gap-5">
              <span className="shrink-0 font-data text-xs font-bold tabular-nums text-ink/25">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-ink">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-center font-data text-[11px] tracking-wide text-ink/25">No lottery. No chance. Highest paid holds rank.</p>
      </div>
    </div>
  );
}
