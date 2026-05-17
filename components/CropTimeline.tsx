"use client";

import { useState, useMemo } from "react";
import {
  Leaf,
  ChevronDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from "lucide-react";

/* ─── Public type ─────────────────────────────────────────────────────────── */

export interface ScanRecord {
  id: string;
  plant_name: string;
  disease: string;
  health_status: "Optimal" | "Moderate" | "Critical";
  confidence: number;
  recommendation: string;
  created_at: string;
  diagnostic_overview?: string;
}

interface CropTimelineProps {
  scans: ScanRecord[];
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatDate(value: string): string {
  const d = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** WMO-like health severity score (higher = healthier) */
function severityScore(status: ScanRecord["health_status"]): number {
  switch (status) {
    case "Optimal":
      return 100;
    case "Moderate":
      return 50;
    case "Critical":
      return 0;
  }
}

/** Return the absolute delta and direction between two statuses */
function statusDelta(
  oldStatus: ScanRecord["health_status"],
  newStatus: ScanRecord["health_status"],
): { delta: number; direction: "improving" | "deteriorating" | "stable" } {
  const oldScore = severityScore(oldStatus);
  const newScore = severityScore(newStatus);
  const delta = newScore - oldScore;
  if (delta > 0) return { delta, direction: "improving" };
  if (delta < 0) return { delta, direction: "deteriorating" };
  return { delta: 0, direction: "stable" };
}

/** True when the plant has clearly gotten healthier from first → latest */
function isImproving(oldStatus: ScanRecord["health_status"], newStatus: ScanRecord["health_status"]): boolean {
  return severityScore(newStatus) > severityScore(oldStatus);
}

function truncate(text: string, max = 180): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/** Per-status colour / glow / icon configuration */
function healthConfig(status: ScanRecord["health_status"]) {
  switch (status) {
    case "Optimal":
      return {
        dot: "bg-emerald-400",
        dotGlow: "shadow-[0_0_6px_rgba(52,211,153,0.7)]",
        line: "border-emerald-500/30",
        trackFill: "bg-emerald-500",
        badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
        bannerBg: "bg-emerald-500/10 border-emerald-500/20",
        bannerText: "text-emerald-300",
        bannerSub: "text-emerald-400/70",
        conditionBg: "bg-emerald-500/10",
        conditionText: "text-emerald-300",
        conditionRing: "ring-emerald-400/30",
        label: "text-emerald-400",
        barFill: "bg-emerald-400",
        icon: CheckCircle,
        deltaArrow: TrendingUp,
      };
    case "Critical":
      return {
        dot: "bg-red-400",
        dotGlow: "shadow-[0_0_6px_rgba(239,68,68,0.7)]",
        line: "border-red-500/30",
        trackFill: "bg-red-500",
        badge: "bg-red-500/15 border-red-500/30 text-red-400",
        bannerBg: "bg-red-500/10 border-red-500/20",
        bannerText: "text-red-300",
        bannerSub: "text-red-400/70",
        conditionBg: "bg-red-500/10",
        conditionText: "text-red-300",
        conditionRing: "ring-red-400/30",
        label: "text-red-400",
        barFill: "bg-red-400",
        icon: AlertTriangle,
        deltaArrow: TrendingDown,
      };
    default:
      return {
        dot: "bg-amber-400",
        dotGlow: "shadow-[0_0_6px_rgba(251,191,36,0.7)]",
        line: "border-amber-500/30",
        trackFill: "bg-amber-500",
        badge: "bg-amber-500/15 border-amber-500/30 text-amber-400",
        bannerBg: "bg-amber-500/10 border-amber-500/20",
        bannerText: "text-amber-300",
        bannerSub: "text-amber-400/70",
        conditionBg: "bg-amber-500/10",
        conditionText: "text-amber-300",
        conditionRing: "ring-amber-400/30",
        label: "text-amber-400",
        barFill: "bg-amber-400",
        icon: AlertTriangle,
        deltaArrow: Minus,
      };
  }
}

/** Group scans by crop name using Array.reduce */
function groupByCrop(scans: ScanRecord[]): Map<string, ScanRecord[]> {
  return scans.reduce<Map<string, ScanRecord[]>>((map, scan) => {
    const key = scan.plant_name.trim();
    const bucket = map.get(key);
    if (bucket) bucket.push(scan);
    else map.set(key, [scan]);
    return map;
  }, new Map());
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function ProgressSummaryRow({
  totalScans,
  latestScan,
  earliestScan,
}: {
  totalScans: number;
  latestScan: ScanRecord;
  earliestScan: ScanRecord;
}) {
  const cfg = healthConfig(latestScan.health_status);
  const improving = isImproving(earliestScan.health_status, latestScan.health_status);
  const declining = !improving && severityScore(earliestScan.health_status) > severityScore(latestScan.health_status);
  const StatusIcon = cfg.icon;
  const DeltaIcon = improving ? cfg.deltaArrow : declining ? cfg.deltaArrow : Minus;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Total scans */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/50">
          <Leaf className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Total Scans</p>
          <p className="text-base font-bold text-white leading-tight">{totalScans}</p>
        </div>
      </div>

      <div className="h-7 w-px bg-zinc-800" aria-hidden="true" />

      {/* Current health status */}
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${cfg.badge}`}>
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Current</p>
          <p className={`text-sm font-bold leading-tight ${cfg.label}`}>{latestScan.health_status}</p>
        </div>
      </div>

      <div className="h-7 w-px bg-zinc-800" aria-hidden="true" />

      {/* Recovery trend delta */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/50">
          <DeltaIcon
            className={`h-4 w-4 ${
              improving
                ? "text-emerald-400"
                : declining
                ? "text-red-400"
                : "text-zinc-500"
            }`}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            {improving ? "Recovery trend" : declining ? "Deteriorating" : "Status stable"}
          </p>
          <p
            className={`text-sm font-bold leading-tight ${
              improving
                ? "text-emerald-400"
                : declining
                ? "text-red-400"
                : "text-zinc-400"
            }`}
          >
            {improving
              ? `↑ +${statusDelta(earliestScan.health_status, latestScan.health_status).delta} pts`
              : declining
              ? `↓ ${statusDelta(earliestScan.health_status, latestScan.health_status).delta} pts`
              : "No change"}
          </p>
        </div>
      </div>

      <div className="h-7 w-px bg-zinc-800" aria-hidden="true" />

      {/* Horizontal progress bar: earliest (left) → latest (right) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 shrink-0">
          Progress
        </span>
        <div className="flex-1 h-2.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full flex"
            role="progressbar"
            aria-valuenow={severityScore(latestScan.health_status)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Health recovery progress"
          >
            <span
              className={`h-full transition-all duration-700 ease-out ${
                improving
                  ? "bg-gradient-to-r from-emerald-500/60 to-emerald-400"
                  : declining
                  ? "bg-gradient-to-r from-red-500/60 to-red-400"
                  : "bg-gradient-to-r from-amber-500/60 to-amber-400"
              }`}
              style={{ width: `${severityScore(latestScan.health_status)}%` }}
            />
          </div>
        </div>
        <span className={`text-[11px] font-bold shrink-0 ${cfg.label}`}>
          {severityScore(latestScan.health_status)}%
        </span>
      </div>
    </div>
  );
}

function TimelineNode({
  scan,
  showConnector,
  isLast,
  index,
}: {
  scan: ScanRecord;
  showConnector: boolean;
  isLast: boolean;
  index: number;
}) {
  const cfg = healthConfig(scan.health_status);
  const HealthIcon = cfg.icon;

  return (
    <li className="relative pb-8 last:pb-0" style={{ animationDelay: `${index * 80}ms` }}>
      {/* ── Vertical connector line ─────────────────────────────────────────── */}
      {showConnector && (
        <div
          className={`absolute left-[11px] top-5 bottom-[-14px] w-0.5 ${cfg.line}`}
          aria-hidden="true"
        />
      )}

      <div className="flex gap-3.5">
        {/* ── Node dot ──────────────────────────────────────────────────────── */}
        <div
          className="relative z-10 mt-[3px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ring-4 ring-zinc-900"
          aria-hidden="true"
        >
          {/* Animated pulse ring */}
          <span
            className={`absolute inset-[-3px] animate-ping rounded-full ${cfg.dot} opacity-20`}
          />
          {/* Solid centre dot */}
          <span className={`relative block h-2.5 w-2.5 rounded-full ${cfg.dot} ${cfg.dotGlow}`} />
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Date badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDate(scan.created_at)}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}
            >
              <span className={`h-1 w-1 rounded-full ${cfg.dot}`} />
              {scan.health_status}
            </span>
          </div>

          {/* Condition — with glow ring and subtle background pulse */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg ${cfg.conditionBg} ring-1 ${cfg.conditionRing} px-2.5 py-1 mb-2`}
          >
            <Zap className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
            <span className={`text-sm font-bold ${cfg.conditionText}`}>{scan.disease}</span>
          </div>

          {/* Confidence micro-progress bar */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cfg.barFill}`}
                style={{ width: `${Math.min(scan.confidence, 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-medium text-zinc-500 shrink-0">
              {scan.confidence}%
            </span>
          </div>

          {/* Action Log — treatment protocol applied at this timestamp */}
          {scan.recommendation && (
            <div className="rounded-lg border border-white/[0.04] bg-zinc-950/70 px-3.5 py-2.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                <HealthIcon className="h-3 w-3" aria-hidden="true" />
                Action Log
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                {truncate(scan.recommendation, 200)}
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */

export default function CropTimeline({ scans }: CropTimelineProps) {
  const [openCrop, setOpenCrop] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* ── Group + sort (oldest → newest) ───────────────────────────────────── */
  const grouped = useMemo(() => {
    const map = groupByCrop(scans);
    for (const bucket of map.values()) {
      bucket.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    return map;
  }, [scans]);

  const cropNames = useMemo(() => Array.from(grouped.keys()), [grouped]);
  const selectedCrop = openCrop ?? cropNames[0] ?? null;
  const timeline = selectedCrop ? grouped.get(selectedCrop) ?? [] : [];

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (cropNames.length === 0) {
    return (
      <section className="w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center shadow-xl">
        <Leaf className="mx-auto h-8 w-8 text-zinc-600 mb-3" aria-hidden="true" />
        <p className="text-sm text-zinc-500">No scans recorded yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Run your first diagnosis to build a timeline.
        </p>
      </section>
    );
  }

  const latestScan = timeline[timeline.length - 1] ?? null;
  const earliestScan = timeline[0] ?? null;
  const showPlaceholder = timeline.length <= 1;

  /* ─── Progress Summary section ──────────────────────────────────────────── */
  const summary = latestScan && earliestScan && (
    <div className="border-b border-zinc-800/40 px-6 py-4 space-y-3">
      {/* Row label */}
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Recovery Progress Index — <span className="text-white">{selectedCrop}</span>
        </h3>
      </div>

      <ProgressSummaryRow
        totalScans={timeline.length}
        latestScan={latestScan}
        earliestScan={earliestScan}
      />
    </div>
  );

  /* ─── Status change banner ──────────────────────────────────────────────── */
  const statusBanner =
    latestScan && earliestScan && timeline.length >= 2 ? (
      <div className="border-b border-zinc-800/40 px-6 py-2.5">
        {(() => {
          const imp = isImproving(earliestScan.health_status, latestScan.health_status);
          const bCfg = imp ? healthConfig("Optimal") : healthConfig("Critical");
          return (
            <div className={`flex items-center gap-2 rounded-lg ${bCfg.bannerBg} border px-3.5 py-2`}>
              <span className="text-base leading-none" role="img" aria-hidden="true">
                {imp ? "🌱" : "⚠️"}
              </span>
              <p className={`text-xs font-semibold ${bCfg.bannerText}`}>
                {imp
                  ? `Condition Improving — from ${earliestScan.health_status} (${formatDate(earliestScan.created_at)}) to ${latestScan.health_status} (${formatDate(latestScan.created_at)})`
                  : `Condition Deteriorating — from ${earliestScan.health_status} to ${latestScan.health_status}. Review action history below.`}
              </p>
            </div>
          );
        })()}
      </div>
    ) : null;

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <section className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 text-zinc-300 shadow-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-zinc-900/80 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              Crop Health Progress
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Track recovery trends and treatment outcomes across every scan.
            </p>
          </div>
        </div>
      </div>

      {/* ── Crop Selector ──────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-6 py-3">
        <label
          htmlFor="crop-select"
          className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block"
        >
          Select Crop
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              {selectedCrop}
              <span className="text-zinc-600">
                ({timeline.length} scan{timeline.length !== 1 ? "s" : ""})
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {dropdownOpen && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-2xl ring-1 ring-black/50"
            >
              {cropNames.map((name) => {
                const count = grouped.get(name)!.length;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={name === selectedCrop}
                      onClick={() => {
                        setOpenCrop(name);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors ${
                        name === selectedCrop
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <Leaf className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                      {name}
                      <span className="ml-auto text-xs text-zinc-600">
                        {count} scan{count !== 1 ? "s" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Progress Summary Row ─────────────────────────────────────────────── */}
      {summary}

      {/* ── Status Banner ───────────────────────────────────────────────────── */}
      {statusBanner}

      {/* ── Single-scan placeholder ─────────────────────────────────────────── */}
      {showPlaceholder ? (
        <div className="px-6 py-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5">
            <span role="img" aria-label="seedling" className="text-[1.2rem] leading-none">
              🌱
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                Progress tracking started
              </p>
              <p className="mt-0.5 text-xs text-emerald-200/70 leading-relaxed">
                Run another scan of <span className="font-semibold">{selectedCrop}</span> and
                its recovery trajectory will appear here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Vertical Timeline Track ──────────────────────────────────────────
           Style:  border-l-2 border-zinc-800 ml-4  → visible spine
           Nodes alternate between filled and outlined connector dots
           Scans flow  bottom → top  (oldest → newest = upward journey)          */
        <div className="px-6 py-5">
          <ol
            className="relative border-l-2 border-zinc-800 ml-[7px] space-y-8"
            aria-label={`${selectedCrop} health progress history`}
          >
            {timeline.map((scan, index) => {
              const isLast = index === timeline.length - 1;
              /* Alternate: even = hollow (ring-only), odd = filled */
              const useFilled = index % 2 === 1;

              return (
                <li
                  key={scan.id}
                  className="relative"
                  style={{
                    animation: "fadeInUp 0.4s ease-out both",
                    animationDelay: `${index * 70}ms`,
                  }}
                >
                  {/* ── Timeline node dot — alternating filled / outlined ───────── */}
                  <div
                    className={`absolute -left-[11px] top-0 h-[22px] w-[22px] rounded-full ring-4 ring-zinc-900 ${
                      useFilled
                        ? "bg-zinc-900 border-2 border-zinc-700"
                        : "bg-zinc-900 border-2 border-zinc-700"
                    }`}
                    aria-hidden="true"
                  >
                    {useFilled ? (
                      <span className={`absolute inset-[3px] rounded-full animate-ping ${healthConfig(scan.health_status).dot} opacity-20`} />
                    ) : null}
                    <span
                      className={`absolute inset-[3px] rounded-full ${
                        useFilled
                          ? `${healthConfig(scan.health_status).dot}`
                          : "border-2 border-zinc-500 bg-transparent"
                      }`}
                    />
                  </div>

                  {/* ── Node content ──────────────────────────────────────────── */}
                  <div className="ml-4 pb-1">
                    {/* Date badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-zinc-600" aria-hidden="true" />
                      <time className="text-[11px] font-medium text-zinc-500">
                        {formatDate(scan.created_at)}
                      </time>
                      {index === 0 && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                          First Scan
                        </span>
                      )}
                      {isLast && index !== 0 && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                          Latest
                        </span>
                      )}
                    </div>

                    {/* Condition card — glowing border ring + background pulse */}
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-lg ${healthConfig(scan.health_status).conditionBg} ring-1 ${healthConfig(scan.health_status).conditionRing} px-2.5 py-1 mb-2 transition-all duration-300 hover:ring-opacity-60`}
                    >
                      <Zap className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
                      <span className={`text-sm font-bold ${healthConfig(scan.health_status).conditionText}`}>
                        {scan.disease}
                      </span>
                    </div>

                    {/* Confidence micro-bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${healthConfig(scan.health_status).barFill}`}
                          style={{ width: `${Math.min(scan.confidence, 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-zinc-500 shrink-0 w-10 text-right">
                        {scan.confidence}%
                      </span>
                    </div>

                    {/* Action Log — treatment protocol at this scan */}
                    {scan.recommendation && (
                      <div className="rounded-lg border border-white/[0.04] bg-zinc-950/70 px-3.5 py-2.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                          <CheckCircle className="h-3 w-3" aria-hidden="true" />
                          Action Log
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                          {truncate(scan.recommendation, 200)}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ── Footer trend strip ───────────────────────────────────────────────── */}
      {timeline.length > 1 && (
        <div className="border-t border-zinc-800/40 px-6 py-2.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-600">
            <span>
              <span className="font-semibold text-zinc-500">{timeline.length}</span> scan
              {timeline.length !== 1 ? "s" : ""} tracked — recovery journey
            </span>
            <div className="flex items-center gap-1.5" aria-label="Status trend">
              <span>Trajectory</span>
              <div className="flex gap-0.5">
                {timeline.map((scan) => {
                  const cfg = healthConfig(scan.health_status);
                  return (
                    <span
                      key={scan.id}
                      className={`h-1.5 w-1.5 rounded-full transition-all ${cfg.dot}`}
                      title={`${scan.health_status} — ${formatDate(scan.created_at)}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
