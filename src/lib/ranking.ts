/**
 * Pure, deterministic business rules for MarkOnTop.
 * No I/O, no framework — fully unit-testable.
 *
 * Ranking rule (tie-break): higher bid wins; on equal bids the EARLIER
 * created_at strictly keeps the higher rank. ORDER BY bid DESC, created_at ASC.
 */

export interface Rankable {
  current_bid: number;
  created_at: string; // ISO timestamp
}

/** -1 => a ranks above b. Deterministic: bid DESC, created_at ASC. */
export function compareRanks<T extends Rankable>(a: T, b: T): number {
  if (a.current_bid !== b.current_bid) return b.current_bid - a.current_bid;
  const ta = new Date(a.created_at).getTime();
  const tb = new Date(b.created_at).getTime();
  return ta - tb;
}

/** Assigns 1-based deterministic positions to an already-sorted list. */
export function computeRanks<T extends Rankable>(listings: T[]): Array<T & { rank: number }> {
  return [...listings].sort(compareRanks).map((l, i) => ({ ...l, rank: i + 1 }));
}

/** Exact rank of one listing within a scope (1-based). Returns null if not found/absent. */
export function getRank<T extends Rankable & { id: string }>(
  listing: Pick<T, "id" | "current_bid" | "created_at">,
  scopedListings: T[]
): number | null {
  let rank = 1;
  for (const other of scopedListings) {
    if (other.id === listing.id) continue;
    if (compareRanks(other as Rankable, listing as Rankable) < 0) rank++;
  }
  return rank;
}

/**
 * Amount to charge a bidder right now (never trust client math).
 *
 * Rules:
 *  - New URL (no existing listing): charge the full bid target, min $1.00.
 *  - Same URL, same owner (upgrade): charge ONLY the difference.
 *  - Same URL, different owner (takeover): charge the full bid target and
 *    require target >= existing bid + $1.00.
 *
 * Throws Error with a user-safe message when the bid is not acceptable.
 */
export function computeChargeAmount(opts: {
  bidTarget: number;
  existing?: { owner_email: string; current_bid: number } | null;
  requesterEmail: string;
}): number {
  const { bidTarget, existing, requesterEmail } = opts;

  if (!Number.isFinite(bidTarget) || bidTarget <= 0) throw new Error("Invalid bid amount.");

  if (!existing) {
    if (bidTarget < 1.0) throw new Error("Minimum entry is $1.00.");
    return round2(bidTarget);
  }

  const isOwner = existing.owner_email.toLowerCase() === requesterEmail.toLowerCase();

  if (isOwner) {
    // Rule 4 — raise own bid: pay only the difference.
    if (bidTarget <= existing.current_bid)
      throw new Error(`Your current placement is already $${existing.current_bid.toFixed(2)}. Bid higher to upgrade.`);
    return round2(bidTarget - existing.current_bid);
  }

  // Rule 3 — take an occupied slot: full amount, >= current + $1.00.
  if (bidTarget < existing.current_bid + 1.0)
    throw new Error(
      `To claim this slot you must place at least $${(existing.current_bid + 1).toFixed(2)} ` +
        `($${existing.current_bid.toFixed(2)} + $1.00).`
    );
  return round2(bidTarget);
}

/**
 * Rank a hypothetical bid at `bidTarget` would land at (1-based) among `board`.
 * Equal bids lose to every earlier listing, so all existing bids >= target count ahead.
 * `excludeId` omits your own listing (upgrade path).
 */
export function previewRank(
  bidTarget: number,
  board: Array<Rankable & { id?: string }>,
  excludeId?: string
): number {
  let rank = 1;
  for (const l of board) {
    if (excludeId && l.id === excludeId) continue;
    if (l.current_bid >= bidTarget) rank++;
  }
  return rank;
}

/** Minimum acceptable TOTAL bid target shown live in the UI. */
export function minimumBidTarget(existing?: { owner_email: string; current_bid: number } | null, email?: string): number {
  if (!existing) return 1.0;
  const isOwner = !!email && existing.owner_email.toLowerCase() === email.toLowerCase();
  return isOwner ? round2(existing.current_bid + 0.01) : round2(existing.current_bid + 1.0);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
