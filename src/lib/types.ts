export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Listing {
  id: string;
  title: string;
  target_url: string;
  banner_url: string;
  description: string | null;
  category_id: string | null;
  owner_email: string;
  current_bid: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BidScope = "global" | "category";

/** Payload carried through Stripe Checkout metadata into the webhook. */
export interface BidMetadata {
  title: string;
  target_url: string; // normalized
  banner_url: string;
  description?: string;
  category_id: string;
  owner_email: string;
  total_bid_target: string; // decimal string, e.g. "12.50"
}
