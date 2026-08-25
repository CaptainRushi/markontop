export const metadata = { title: "Terms and Conditions — MarkOnTop" };

const SECTIONS = [
  {
    n: 1,
    title: "Acceptance of Terms",
    body: "By accessing or using MarkOnTop, you agree to these Terms and the Rules above. If you do not agree, do not use the platform.",
    highlight: false,
  },
  {
    n: 2,
    title: "Eligibility",
    body: "You must be 18 or older to submit a listing or place a bid. Listings must represent a real, functioning product, service, or business — placeholder, fake, or non-functional listings are not permitted.",
    highlight: false,
  },
  {
    n: 3,
    title: "Bidding",
    body: "All bids are denominated in USD and processed through Stripe. Bidding mechanics follow the Rules section above, which is incorporated into these Terms by reference.",
    highlight: false,
  },
  {
    n: 4,
    title: "No Refunds",
    body: "All bid payments are final. Being outbid, having a listing removed for a Terms violation, or changing your mind after payment does not entitle you to a refund. The sole exception is the race-condition scenario described in Rule 9 above, where a specific technical failure causes a charge without a successful rank change — that exact amount is refunded automatically. No other circumstance qualifies for a refund under any condition.",
    highlight: true,
  },
  {
    n: 5,
    title: "Assumption of Risk",
    body: "Placing a bid on MarkOnTop is a discretionary purchase of advertising placement. It is not an investment, and it carries no guarantee of any return — financial, promotional, or otherwise. Because bids are non-refundable (Section 4), any amount you commit to a bid can be permanently lost if a competing bid takes your rank. You bid with full awareness that this is real money, spent at your own risk, with no recourse beyond the single refund exception stated above.",
    highlight: true,
  },
  {
    n: 6,
    title: "No Profit Share",
    body: "MarkOnTop retains 100% of all bid revenue. No portion of any bid payment is shared with, or paid out to, any user — including a user who previously held a rank and was subsequently outbid. There is no affiliate program, no revenue share, and no payout structure of any kind on this platform.",
    highlight: true,
  },
  {
    n: 7,
    title: "Content Standards",
    body: "Every banner and listing must accurately represent a real, functioning product. Illegal, adult, hateful, scam-related, or malware-linked content is prohibited. MarkOnTop reserves the right to remove any listing that violates this standard, without refund, per Rule 8/9 above.",
    highlight: false,
  },
  {
    n: 8,
    title: "Prohibited Categories",
    body: "The following are not permitted on MarkOnTop regardless of bid amount: gambling, adult content, weapons, illegal drugs, counterfeit goods, financial scams or get-rich-quick schemes, and hacking tools or services.",
    highlight: false,
  },
  {
    n: 9,
    title: "Intellectual Property",
    body: "You retain ownership of any banner or content you submit. By submitting it, you grant MarkOnTop a license to display that content publicly on the platform for as long as your listing remains active.",
    highlight: false,
  },
  {
    n: 10,
    title: "Platform Rights",
    body: "MarkOnTop reserves the right to change these Rules and Terms, remove any listing, and suspend or ban any user, at its sole discretion, without liability.",
    highlight: false,
  },
  {
    n: 11,
    title: "Limitation of Liability",
    body: "MarkOnTop is not liable for any business outcome — including but not limited to clicks, traffic, or sales — resulting from a listing's rank or placement on the platform.",
    highlight: false,
  },
  {
    n: 12,
    title: "Disclaimer",
    body: 'The platform is provided "as is," with no guarantee of uptime, availability, or the promotional value of any given rank.',
    highlight: false,
  },
  {
    n: 13,
    title: "Governing Law",
    body: "[To be finalized with legal counsel — options under consideration: India, given the founder's location, if the primary user base is Indian; otherwise a US entity/Delaware, if targeting a global Stripe-processed user base. This determines applicable tax and dispute-resolution rules and should not be finalized without legal input.]",
    highlight: false,
  },
  {
    n: 14,
    title: "Changes to These Terms",
    body: "These Terms may be updated at any time. Continued use of MarkOnTop after a change constitutes acceptance of the updated Terms.",
    highlight: false,
  },
];

export default function TermsPage() {
  return (
    <div className="-mx-4 -mb-20 bg-paper px-4 py-10 text-track sm:-mx-6 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-[32px] font-black tracking-[-0.02em] text-track sm:text-[40px]" style={{ fontStretch: "condensed" }}>
          Terms and Conditions
        </h1>
        <p className="mt-2 font-data text-xs tracking-wide text-track/40">Plain and trustworthy — real money changes hands here.</p>

        <div className="mt-8 divide-y divide-track/10 border-y border-track/10">
          {SECTIONS.map((s) => (
            <section
              key={s.n}
              className={`py-6 ${s.highlight ? "bg-track/[0.04] -mx-4 px-4 sm:-mx-6 sm:px-6 border-l-2 border-track/20" : ""}`}
            >
              <h2 className={`text-sm font-bold tracking-tight ${s.highlight ? "text-track" : "text-track"}`}>
                {s.n}. {s.title}
                {s.highlight && <span className="ml-2 inline-flex rounded bg-track px-1.5 py-0.5 font-data text-[10px] font-bold tracking-wide text-paper">IMPORTANT</span>}
              </h2>
              <p className={`mt-2 text-sm leading-relaxed ${s.highlight ? "font-medium text-track/70" : "text-track/60"}`}>{s.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 border-t border-track/10 pt-6 text-center font-data text-[11px] leading-relaxed tracking-wide text-track/25">
          Not legal advice — have a lawyer review before processing real payments.
        </p>
      </div>
    </div>
  );
}
