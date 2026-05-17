/**
 * types/market.ts
 *
 * Strict TypeScript interfaces for the Market Intelligence feature.
 * Mirrors the `market_intelligence` and `market_price_history`
 * Supabase table schemas exactly.
 */

/** Wholesale price record — one row per crop / market hub. */
export interface MarketPriceRecord {
  id: string;
  crop_name: string;
  market_hub: string;
  region: string;
  price_kes_per_unit: number;
  unit_label: string;          // e.g. "90 kg bag", "60 kg crate", "per kg"
  price_change_percent: number;
  trend_direction: "up" | "down" | "stable";
  updated_at: string;          // ISO timestamp
  currency: string;            // always "KES" for localised view
  source: string;              // e.g. "Nairobi Mombasa KMA"
  volume_traded_tonnes?: number;
}

/** Single historical data-point used for chart / trend tracking ledger */
export interface MarketHistoryRecord {
  id: string;
  crop_name: string;
  market_hub: string;
  recorded_at: string;         // ISO timestamp of the price point
  price_kes_per_unit: number;
  unit_label: string;
  source: string;
}

/** Shape returned by the live /api/market endpoint */
export interface MarketIntelligenceResponse {
  prices: MarketPriceRecord[];
  history: MarketHistoryRecord[];
  lastSync: string;
  note: string;
}
