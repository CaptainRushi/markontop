/**
 * Minimal URL reputation + content checks for first-time listings (Section 6).
 * Keep this cheap and synchronous; heavy ML review is v2.
 */

const BLOCKED_KEYWORDS = [
  "casino", "gambling", "porn", "nsfw", "escort", "pharma", "viagra",
  "hacking", "malware", "darknet",
];

const SUSPICIOUS_TLDS = new Set([".tk", ".ml", ".ga", ".cf", ".gq"]);

export type FraudCheck = { ok: boolean; reason?: string };

export function checkUrlReputation(urlNormalized: string, title: string): FraudCheck {
  const lower = `${urlNormalized} ${title}`.toLowerCase();
  for (const kw of BLOCKED_KEYWORDS) {
    if (lower.includes(kw)) return { ok: false, reason: `blocked_keyword:${kw}` };
  }
  try {
    const u = new URL(`https://${urlNormalized}`);
    for (const tld of SUSPICIOUS_TLDS) if (u.hostname.endsWith(tld)) return { ok: false, reason: `suspicious_tld:${tld}` };
  } catch {}
  return { ok: true };
}

export function flagForReview(listingId: string, reason: string) {
  // Inserted by the checkout handler via service role; fire-and-forget.
  // Caller should not block the PaymentIntent on this.
  return { listingId, reason };
}
