/**
 * components/FertilizerAdvisor.tsx
 *
 * Client Component — "Smart Fertilizer Recommendations"
 *
 * Props
 * ─────
 *   cropType    string   — e.g. "Tomato", "Maize"
 *   condition   string   — e.g. "Tomato Late Blight", "Rust"
 *                           Passed directly from the Hugging Face classification
 *                           top-result so the Gemini call is one frame away
 *                           from the image diagnosis.
 *
 * The component POSTs to /api/fertilizer on every prop/crop change and
 * renders the AI-generated N-P-K split, synthetic vs organic treatment
 * split-pane, and the safety advisory block.
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Leaf, Loader2, AlertTriangle, Beaker, FlaskConical, Sprout, ShieldAlert } from "lucide-react";

/* ─── Returned shape from /api/fertilizer ─────────────────────────────────── */

interface FertilizerPayload {
  nitrogen_ratio: number;
  phosphorus_ratio: number;
  potassium_ratio: number;
  synthetic_name: string;
  synthetic_dosage: string;
  organic_alternative: string;
  application_frequency: string;
  safety_precaution: string;
}

interface FertilizerAdvisorProps {
  /** Crop name — e.g. "Tomato", "Maize" */
  cropType: string;
  /** Diagnosed condition label — e.g. "Tomato Late Blight" */
  condition: string;
}

/* ─── Default skeleton / safe payloads ─────────────────────────────────────── */

const LOADING_PAYLOAD: FertilizerPayload = {
  nitrogen_ratio:       0,
  phosphorus_ratio:     0,
  potassium_ratio:      0,
  synthetic_name:       "…",
  synthetic_dosage:     "🤖 Gemini AI is calculating optimized N-P-K ratios and custom treatment balances…",
  organic_alternative:  "…",
  application_frequency:"…",
  safety_precaution:    "…",
};

/* ─── Skeleton track ───────────────────────────────────────────────────────── */

function SkeletonGauge() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-1 h-5 rounded-full overflow-hidden">
        <div className="flex-1 bg-blue-500/20 rounded-l-full" />
        <div className="flex-1 bg-orange-500/20" />
        <div className="flex-1 bg-purple-500/20 rounded-r-full" />
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="h-2.5 w-3/4 rounded bg-white/5" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-1.5">
      <div className="h-2.5 w-28 rounded bg-white/5" />
      <div className="h-2.5 w-full rounded bg-white/5" />
      <div className="h-2.5 w-5/6 rounded bg-white/5" />
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/** Format a ratio as a clean percent string, guaranteed 0–100 */
function pct(val: number): string {
  return `${Math.max(0, Math.min(100, Math.round(val)))}%`;
}

/** Build the bar width styles for the three N-P-K segments */
function segmentWidths(n: number, p: number, k: number) {
  const total = n + p + k || 1; // avoid division by zero
  return {
    n: `${(n / total) * 100}%`,
    p: `${(p / total) * 100}%`,
    k: `${(k / total) * 100}%`,
  };
}

/* ─── Main component ───────────────────────────────────────────────────────── */

export default function FertilizerAdvisor({ cropType, condition }: FertilizerAdvisorProps) {
  const [data, setData]       = useState<FertilizerPayload>(LOADING_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  /* ── Fetch on crop / condition change ──────────────────────────────────── */
  const fetchRecommendation = useCallback(async () => {
    if (!cropType || !condition) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fertilizer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ cropType, condition }),
        cache:   "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? `HTTP ${res.status}`);
      }

      const payload = (await res.json()) as FertilizerPayload;
      setData(payload);
    } catch (e: any) {
      setError(e.message ?? "Failed to load recommendation.");
      setData(LOADING_PAYLOAD);
    } finally {
      setLoading(false);
    }
  }, [cropType, condition]);

  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  /* ── Derived values ─────────────────────────────────────────────────────── */
  const widths   = segmentWidths(data.nitrogen_ratio, data.phosphorus_ratio, data.potassium_ratio);
  const allZero  = data.nitrogen_ratio === 0 && data.phosphorus_ratio === 0 && data.potassium_ratio === 0;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <section className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 text-zinc-300 shadow-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-zinc-900/80 px-5 py-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Beaker className="h-4.5 w-4.5 text-emerald-400" aria-hidden="true" />
          Smart Fertilizer Advisor
        </h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          AI-precision N-P-K recommendations for{" "}
          <span className="text-zinc-300 font-medium">{cropType || "your crop"}</span>
          {condition && (
            <>
              {" "}affected by <span className="text-amber-400">{condition}</span>
            </>
          )}
        </p>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-5">

        {/* ── Loading state ────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-400" aria-hidden="true" />
            <p className="text-sm text-zinc-400 text-center leading-relaxed">
              🤖 Gemini AI is calculating optimized N-P-K ratios and custom treatment balances…
            </p>
            <div className="w-full max-w-sm space-y-3 mt-1">
              <SkeletonGauge />
              <div className="grid grid-cols-2 gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
              <SkeletonCard />
            </div>
          </div>
        )}

        {/* ── Error state ───────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-red-300">Recommendation unavailable</p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Live content ──────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="space-y-5">

            {/* ── N-P-K Gauge ───────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  N-P-K Nutrient Ratio
                </h3>
                {!allZero && (
                  <span className="text-[10px] text-zinc-600">
                    Recomputed by Gemini AI
                  </span>
                )}
              </div>

              <div className="flex gap-1 h-[22px] rounded-full overflow-hidden ring-1 ring-white/[0.04]">
                {/* Nitrogen – Blue */}
                <div
                  className="h-full bg-blue-500 transition-all duration-700 ease-out relative group"
                  style={{ width: widths.n }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.12] to-transparent rounded-l-full" />
                </div>
                {/* Phosphorus – Orange */}
                <div
                  className="h-full bg-orange-500 transition-all duration-700 ease-out relative group"
                  style={{ width: widths.p }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-400" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.12] to-transparent" />
                </div>
                {/* Potassium – Purple */}
                <div
                  className="h-full bg-purple-500 transition-all duration-700 ease-out relative group rounded-r-full"
                  style={{ width: widths.k }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-400" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.12] to-transparent rounded-r-full" />
                </div>
              </div>

              {/* Ratio labels below the bar */}
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Nitrogen</p>
                  <p className="text-sm font-bold text-white mt-0.5">{pct(data.nitrogen_ratio)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Phosphorus</p>
                  <p className="text-sm font-bold text-white mt-0.5">{pct(data.phosphorus_ratio)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Potassium</p>
                  <p className="text-sm font-bold text-white mt-0.5">{pct(data.potassium_ratio)}</p>
                </div>
              </div>
            </div>

            {/* ── Split-pane: Synthetic vs Organic ──────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-3">
              {/* Synthetic */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/50 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <FlaskConical className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Synthetic Protocol</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Fertilizer</p>
                    <p className="text-xs text-zinc-300 mt-0.5 font-medium">{data.synthetic_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Dosage</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed whitespace-pre-line">{data.synthetic_dosage}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Frequency</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{data.application_frequency}</p>
                  </div>
                </div>
              </div>

              {/* Organic */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/50 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Sprout className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Organic / Bio-Alternative</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Recommended</p>
                    <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed whitespace-pre-line">{data.organic_alternative}</p>
                  </div>
                  <div className="pt-1 border-t border-white/[0.04]">
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      Organic alternatives often work slower but build long-term soil
                      microbial health. Pair with synthetic above for critical shortages.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Safety Block ───────────────────────────────────────────────── */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
              <ShieldAlert
                className="h-4 w-4 text-amber-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Safety &amp; Application Advisory</p>
                <p className="text-xs text-amber-200/70 leading-relaxed whitespace-pre-line">{data.safety_precaution}</p>
                <p className="text-[10px] text-amber-400/50 mt-1">
                  Generated by Gemini AI (gemini-1.5-flash) — verify with a professional agronomist before field application.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}
