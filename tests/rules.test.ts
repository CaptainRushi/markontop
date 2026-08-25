import { describe, expect, it } from "vitest";
import {
  compareRanks,
  computeRanks,
  getRank,
  computeChargeAmount,
  minimumBidTarget,
  previewRank,
} from "@/lib/ranking";
import { isValidNormalizedUrl, normalizeUrl } from "@/lib/url";
import { CATEGORIES, ENTRY_FLOOR } from "@/lib/categories";

const iso = (offsetMinutes: number) =>
  new Date(Date.UTC(2026, 0, 1, 12, offsetMinutes)).toISOString();

describe("deterministic ranking (Rule 5 — tie-breaking)", () => {
  it("orders strictly by bid descending", () => {
    const a = { current_bid: 5, created_at: iso(10) };
    const b = { current_bid: 9, created_at: iso(0) };
    expect(compareRanks(a, b)).toBeGreaterThan(0); // b ranks above a
    expect(compareRanks(b, a)).toBeLessThan(0);
  });

  it("breaks ties by EARLIER created_at keeping the higher rank", () => {
    const earlier = { current_bid: 5, created_at: iso(0) };
    const later = { current_bid: 5, created_at: iso(30) };
    expect(compareRanks(earlier, later)).toBeLessThan(0); // earlier first
    expect(computeRanks([later, earlier])[0].created_at).toBe(iso(0));
    expect(computeRanks([later, earlier])[1].rank).toBe(2);
  });

  it("computes exact rank within a scoped board", () => {
    const board = [
      { id: "a", current_bid: 10, created_at: iso(0) },
      { id: "b", current_bid: 7, created_at: iso(5) },
      { id: "c", current_bid: 7, created_at: iso(9) }, // same bid as b, later => below b
      { id: "d", current_bid: 3, created_at: iso(0) },
    ];
    expect(getRank({ id: "a", current_bid: 10, created_at: iso(0) }, board)).toBe(1);
    expect(getRank({ id: "b", current_bid: 7, created_at: iso(5) }, board)).toBe(2);
    expect(getRank({ id: "c", current_bid: 7, created_at: iso(9) }, board)).toBe(3);
    expect(getRank({ id: "d", current_bid: 3, created_at: iso(0) }, board)).toBe(4);
  });
});

describe("previewRank (live 'lands at #N' helper)", () => {
  const board = [
    { id: "a", current_bid: 10, created_at: iso(0) },
    { id: "b", current_bid: 7, created_at: iso(5) },
    { id: "d", current_bid: 3, created_at: iso(0) },
  ];

  it("counts all bids >= target ahead of the new bid", () => {
    expect(previewRank(8, board)).toBe(2); // beats d only... no: beats b? 10>=8 yes, 7>=8 no → #2
    expect(previewRank(11, board)).toBe(1); // takes #1
    expect(previewRank(3, board)).toBe(4); // equal to existing loses to all
  });

  it("excludeId omits own listing on upgrade", () => {
    expect(previewRank(11, board, "a")).toBe(1); // own top listing excluded
    expect(previewRank(12, board)).toBe(1);
  });

  it("empty board => #1", () => {
    expect(previewRank(1, [])).toBe(1);
  });
});

describe("payment engine (Rules 2–4)", () => {
  it("charges full amount for a new listing with $1.00 floor", () => {
    expect(computeChargeAmount({ bidTarget: 1, existing: null, requesterEmail: "x@y.z" })).toBe(1);
    expect(() =>
      computeChargeAmount({ bidTarget: 0.99, existing: null, requesterEmail: "x@y.z" })
    ).toThrow(/Minimum entry is \$1\.00/);
    expect(ENTRY_FLOOR).toBe(1.0);
  });

  it("upgrade path charges ONLY the difference (Rule 4)", () => {
    const charge = computeChargeAmount({
      bidTarget: 25,
      existing: { owner_email: "me@x.com", current_bid: 10 },
      requesterEmail: "me@x.com",
    });
    expect(charge).toBe(15);
  });

  it("upgrade rejects equal or lower totals", () => {
    const ex = { owner_email: "me@x.com", current_bid: 10 };
    expect(() => computeChargeAmount({ bidTarget: 10, existing: ex, requesterEmail: "me@x.com" })).toThrow(
      /already/
    );
    expect(() => computeChargeAmount({ bidTarget: 5, existing: ex, requesterEmail: "me@x.com" })).toThrow();
  });

  it("takeover requires full payment of >= current + $1.00 (Rule 3)", () => {
    const holder = { owner_email: "them@x.com", current_bid: 50 };
    // $51.00 exactly is allowed
    expect(computeChargeAmount({ bidTarget: 51, existing: holder, requesterEmail: "me@x.com" })).toBe(51);
    // $50.99 is rejected
    expect(() =>
      computeChargeAmount({ bidTarget: 50.99, existing: holder, requesterEmail: "me@x.com" })
    ).toThrow(/\$51\.00/);
    // pays the FULL amount, not the delta
    const charge = computeChargeAmount({ bidTarget: 80, existing: holder, requesterEmail: "me@x.com" });
    expect(charge).toBe(80);
  });

  it("live minimum calculation mirrors server rules", () => {
    expect(minimumBidTarget(null)).toBe(1.0);
    expect(minimumBidTarget({ owner_email: "them@x.com", current_bid: 20 }, "me@x.com")).toBe(21);
    // owner may nudge by as little as one cent
    expect(minimumBidTarget({ owner_email: "me@x.com", current_bid: 20 }, "me@x.com")).toBe(20.01);
  });

  it("rounds money to cents deterministically", () => {
    const charge = computeChargeAmount({
      bidTarget: 10.105,
      existing: null,
      requesterEmail: "x@y.z",
    });
    expect(charge).toBe(10.11); // no float dust
  });
});

describe("one-listing-per-URL normalization (Rule 6)", () => {
  it("collapses protocol/www/case/trailing-slash/query/fragment variants", () => {
    const expected = "example.com/tool";
    expect(normalizeUrl("https://www.example.com/tool/")).toBe(expected);
    expect(normalizeUrl("HTTP://EXAMPLE.COM/tool?utm=x#top")).toBe(expected);
    expect(normalizeUrl("https://Example.com/tool")).toBe(expected);
    expect(normalizeUrl("example.com/tool")).toBe(expected);
  });

  it("rejects junk", () => {
    expect(normalizeUrl("not a url")).toBe("");
    expect(isValidNormalizedUrl(normalizeUrl("no-tld"))).toBe(false);
    expect(isValidNormalizedUrl("example.com")).toBe(true);
  });
});

describe("categories (Rule 8)", () => {
  it("exposes exactly the 10 fixed boards with unique ids and slugs", () => {
    expect(CATEGORIES.length).toBe(10);
    const ids = new Set(CATEGORIES.map((c) => c.id));
    const slugs = new Set(CATEGORIES.map((c) => c.slug));
    expect(ids.size).toBe(10);
    expect(slugs.size).toBe(10);
  });
});
