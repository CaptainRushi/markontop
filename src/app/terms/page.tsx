export const metadata = { title: "Terms & Conditions — MarkOnTop" };

const SECTIONS = [
  {
    h: "1. Nature of the Service",
    p: [
      "MarkOnTop is a deterministic paid-placement advertising service. Placement position on any board is determined solely and mechanically by the amount a customer pays. Higher payment equals higher placement; there is no element of chance, drawing, lottery, sweepstake, wagering, or game of skill involved in any part of the service.",
      "A placement fee purchases advertising exposure at a computed rank. It is not an investment, a deposit, or an entry into any prize promotion, and it confers no ownership interest of any kind.",
    ],
  },
  {
    h: "2. No Refunds",
    p: ["All payments are final and non-refundable in full or in part under all circumstances, including without limitation: removal of your listing for violation of these Terms; another advertiser outbidding you; you voluntarily abandoning or discontinuing your listing; or service interruptions."],
  },
  {
    h: "3. No Revenue Share / No Profit Share",
    p: ["Placement fees purchase advertising only. MarkOnTop does not offer, promise, or pay any revenue share, profit share, commission, return, yield, rebate, dividend, or other distribution to advertisers. Any claim to the contrary is false and unauthorized."],
  },
  {
    h: "4. Deterministic Ranking Rules",
    p: ["Ranking is strictly deterministic: listings are ordered by paid amount descending; ties are broken by earliest payment timestamp (earlier keeps the higher rank). The $1.00 entry floor places a listing on the matching board. To take an occupied rank you must place at least $1.00 above the current holder's amount and pay the full amount. Raising your own bid charges only the difference. Ranks persist until outbid; amounts never decay over time."],
  },
  {
    h: "5. Prohibited Content",
    p: ["You may not submit listings that are illegal, fraudulent, deceptive, or that promote: gambling or casinos; adult sexual content; weapons; drugs or drug paraphernalia; hate speech or harassment; malware or hacking services; counterfeit goods; pyramid or Ponzi schemes; unlicensed financial products or trading signals; human exploitation; or any content prohibited by our payment processors. We may remove any listing at our sole discretion, with no refund."],
  },
  {
    h: "6. Content Removal Rights",
    p: ["MarkOnTop reserves the unconditional right to remove, suspend, or refuse any listing, banner, description, or linked destination at any time for any reason, including violations of these Terms, complaints from third parties, processor requirements, or legal obligations. Removal does not entitle you to any refund."],
  },
  {
    h: "7. Your Responsibilities & Warranties",
    p: ["You warrant that you own or have rights to all submitted content (title, banner image, description) and that your linked site complies with applicable law. You indemnify MarkOnTop against claims arising from your content or destination site."],
  },
  {
    h: "8. One Listing Per URL",
    p: ["Each target URL may hold exactly one listing on the platform. Category selection is fixed at submission and cannot be changed; to appear in a different category you must submit a new listing with a different URL."],
  },
  {
    h: "9. Limitation of Liability",
    p: ['The service is provided "as is" without warranties of any kind. MarkOnTop\'s total liability arising from your use of the service shall not exceed the amount you paid for the affected placement.'],
  },
];

export default function TermsPage() {
  return (
    <div className="-mx-4 -mb-20 bg-paper px-4 py-10 text-ink sm:-mx-6 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-[32px] font-black tracking-[-0.02em] text-ink sm:text-[40px]">Terms &amp; Conditions</h1>
        <p className="mt-2 font-data text-xs tracking-wide text-ink/40">By submitting a placement or using MarkOnTop you agree to these terms.</p>

        <div className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
          {SECTIONS.map((s) => (
            <section key={s.h} className="py-6">
              <h2 className="text-sm font-bold tracking-tight text-ink">{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-ink/60">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-6 text-center font-data text-[11px] tracking-wide text-ink/25">No lottery. No chance. Highest paid holds rank.</p>
      </div>
    </div>
  );
}
