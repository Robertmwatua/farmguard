"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crown,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPinned,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
} from "lucide-react";

interface AgrovetMarketplaceRecord {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  isPremiumPartner: boolean;
  offersDelivery: boolean;
  deliveryCommissionRate: number;
  medicineInventory: string[];
  hasTreatmentInStock: boolean;
  treatmentNeeded: string;
  marketplaceRank: number;
  isRegistered: boolean;
  source: "registered" | "live-nearby";
}

interface AgrovetApiResponse {
  agrovets: AgrovetMarketplaceRecord[];
  recommendedAgrovets?: AgrovetMarketplaceRecord[];
  registeredAgrovets?: AgrovetMarketplaceRecord[];
  nearbyAgrovets?: AgrovetMarketplaceRecord[];
  treatmentNeeded: string;
  farmerLocation?: {
    lat: number;
    lng: number;
  };
}

interface NearbyAgrovetsProps {
  treatmentNeeded?: string;
}

type Language = "en" | "sw";
type Theme = "dark" | "light";
type Section = "recommended" | "registered" | "nearby";

const FALLBACK_LATITUDE = -1.2921;
const FALLBACK_LONGITUDE = 36.8219;

const copy = {
  en: {
    badge: "Two-Sided Agrovet Marketplace",
    title: "Agrovet Treatment Access",
    subtitle:
      "Start with three recommended partners, then inspect registered suppliers or live nearby map results.",
    recommended: "Recommended",
    registered: "Registered",
    nearby: "Nearby Map",
    liveGps: "Live browser GPS active",
    fallbackGps: "Showing Nairobi demo radius",
    locating: "Requesting browser GPS",
    treatment: "Treatment",
    premium: "Premium",
    delivery: "Delivery",
    inStock: "In Stock",
    marketplaceUnavailable: "Marketplace unavailable",
    noAgrovets: "No agrovets found",
    noAgrovetsHelp: "Add active records to agrovet_profiles with latitude and longitude.",
    exactLocation: "Exact store location",
    distance: "Distance",
    coordinates: "Coordinates",
    getDirections: "Get Directions",
    openMaps: "Open in Google Maps",
    mapHelp: "Use the map controls to zoom and pan before opening turn-by-turn navigation.",
    location: "Location",
    platformFee: "Platform Fee",
    pickup: "Pickup",
    available: "Available",
    callStore: "Call Store",
    noPhone: "No Phone",
    viewMap: "View on Map",
    orderDeliver: "Order & Deliver",
    treatmentMatch: "Treatment Match",
    noExact: "No Exact Match",
    deliveryLoop: "Delivery Loop",
    notOffered: "Not Offered",
    rank: "Marketplace Rank",
    boosted: "Boosted",
    distanceRank: "Distance",
    inventory: "Medicine Inventory",
    inventoryHelp: "Horizontal chips make products easier to scan.",
    listed: "listed",
    notPublished: "Inventory not published",
    verified: "Verified Partner",
    deliveryAvailable: "Delivery available",
    noExplicit: "No explicit match",
  },
  sw: {
    badge: "Soko la Agrovet la Pande Mbili",
    title: "Upatikanaji wa Tiba za Mazao",
    subtitle:
      "Anza na washirika watatu waliopendekezwa, kisha angalia maduka yaliyosajiliwa au yaliyo karibu kwenye ramani.",
    recommended: "Mapendekezo",
    registered: "Yaliyosajiliwa",
    nearby: "Ramani Karibu",
    liveGps: "GPS ya kifaa inatumika",
    fallbackGps: "Inaonyesha eneo la mfano Nairobi",
    locating: "Inaomba ruhusa ya GPS",
    treatment: "Tiba",
    premium: "Premium",
    delivery: "Delivery",
    inStock: "Ipo",
    marketplaceUnavailable: "Soko halipatikani",
    noAgrovets: "Hakuna agrovets zilizopatikana",
    noAgrovetsHelp: "Ongeza rekodi hai zenye latitude na longitude kwenye agrovet_profiles.",
    exactLocation: "Eneo kamili la duka",
    distance: "Umbali",
    coordinates: "Koratibu",
    getDirections: "Pata Maelekezo",
    openMaps: "Fungua Google Maps",
    mapHelp: "Tumia vidhibiti vya ramani kuvuta karibu kabla ya kufungua maelekezo.",
    location: "Eneo",
    platformFee: "Ada ya Jukwaa",
    pickup: "Kuchukua",
    available: "Inapatikana",
    callStore: "Piga Simu",
    noPhone: "Hakuna Simu",
    viewMap: "Ona Ramani",
    orderDeliver: "Agiza na Leta",
    treatmentMatch: "Ulinganifu wa Tiba",
    noExact: "Haijalingana",
    deliveryLoop: "Mzunguko wa Delivery",
    notOffered: "Haipo",
    rank: "Nafasi Sokoni",
    boosted: "Imepewa Kipaumbele",
    distanceRank: "Umbali",
    inventory: "Dawa Zilizopo",
    inventoryHelp: "Chips za bidhaa hurahisisha kusoma haraka.",
    listed: "zimeorodheshwa",
    notPublished: "Bidhaa hazijawekwa",
    verified: "Mshirika Aliyethibitishwa",
    deliveryAvailable: "Delivery ipo",
    noExplicit: "Hakuna ulinganifu wa moja kwa moja",
  },
} satisfies Record<Language, Record<string, string>>;

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.max(50, Math.round(distanceKm * 1000))} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

function formatFee(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function normalizeTreatment(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function buildMapEmbedUrl(lat: number, lng: number): string {
  const zoomPadding = 0.012;
  const bbox = [
    lng - zoomPadding,
    lat - zoomPadding,
    lng + zoomPadding,
    lat + zoomPadding,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
}

function buildGoogleMapsDirectionsUrl(
  destinationLat: number,
  destinationLng: number,
  origin?: { lat: number; lng: number } | null,
): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destinationLat},${destinationLng}`,
    travelmode: "driving",
  });

  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildGoogleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

function MarketplaceSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="grid animate-pulse gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 lg:grid-cols-[320px_minmax(0,1fr)]"
        >
          <div className="space-y-4 rounded-lg bg-white/[0.03] p-5">
            <div className="h-5 w-48 rounded bg-white/10" />
            <div className="h-3 w-56 max-w-full rounded bg-white/10" />
            <div className="h-10 w-full rounded bg-white/10" />
            <div className="h-10 w-full rounded bg-white/10" />
          </div>
          <div className="space-y-5 p-2">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="h-16 rounded bg-white/10" />
              <div className="h-16 rounded bg-white/10" />
              <div className="h-16 rounded bg-white/10" />
              <div className="h-16 rounded bg-white/10" />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-9 w-28 rounded-full bg-white/10" />
              <div className="h-9 w-36 rounded-full bg-white/10" />
              <div className="h-9 w-32 rounded-full bg-white/10" />
              <div className="h-9 w-40 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NearbyAgrovets({
  treatmentNeeded = "fungicide",
}: NearbyAgrovetsProps) {
  const [agrovets, setAgrovets] = useState<AgrovetMarketplaceRecord[]>([]);
  const [recommendedAgrovets, setRecommendedAgrovets] = useState<AgrovetMarketplaceRecord[]>([]);
  const [registeredAgrovets, setRegisteredAgrovets] = useState<AgrovetMarketplaceRecord[]>([]);
  const [nearbyAgrovets, setNearbyAgrovets] = useState<AgrovetMarketplaceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<"locating" | "live" | "fallback">("locating");
  const [farmerLocation, setFarmerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAgrovetId, setSelectedAgrovetId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("recommended");
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("dark");

  const cleanTreatment = useMemo(() => treatmentNeeded.trim() || "fungicide", [treatmentNeeded]);
  const text = copy[language];
  const isLight = theme === "light";

  const fetchAgrovets = useCallback(async (lat: number, lng: number) => {
    const query = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      treatmentNeeded: cleanTreatment,
    });

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/agrovets?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load nearby agrovet partners.");
      }

      const payload = (await response.json()) as AgrovetApiResponse;
      const recommended = payload.recommendedAgrovets ?? payload.agrovets ?? [];
      const registered = payload.registeredAgrovets ?? payload.agrovets ?? [];
      const nearby = payload.nearbyAgrovets ?? registered;
      setRecommendedAgrovets(recommended);
      setRegisteredAgrovets(registered);
      setNearbyAgrovets(nearby);
      setAgrovets(recommended);
      setFarmerLocation(payload.farmerLocation ?? { lat, lng });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load nearby agrovet partners.",
      );
      setAgrovets([]);
      setRecommendedAgrovets([]);
      setRegisteredAgrovets([]);
      setNearbyAgrovets([]);
    } finally {
      setIsLoading(false);
    }
  }, [cleanTreatment]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationMode("fallback");
      void fetchAgrovets(FALLBACK_LATITUDE, FALLBACK_LONGITUDE);
      return;
    }

    setLocationMode("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationMode("live");
        void fetchAgrovets(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocationMode("fallback");
        void fetchAgrovets(FALLBACK_LATITUDE, FALLBACK_LONGITUDE);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  }, [fetchAgrovets]);

  useEffect(() => {
    const allAgrovets = [...recommendedAgrovets, ...registeredAgrovets, ...nearbyAgrovets];

    if (allAgrovets.length === 0) {
      setSelectedAgrovetId(null);
      return;
    }

    setSelectedAgrovetId((currentId) => {
      if (currentId && allAgrovets.some((agrovet) => agrovet.id === currentId)) {
        return currentId;
      }

      return (nearbyAgrovets[0] ?? recommendedAgrovets[0] ?? registeredAgrovets[0]).id;
    });
  }, [nearbyAgrovets, recommendedAgrovets, registeredAgrovets]);

  const visibleAgrovets =
    activeSection === "recommended"
      ? recommendedAgrovets
      : activeSection === "registered"
        ? registeredAgrovets
        : nearbyAgrovets;
  const premiumCount = registeredAgrovets.filter((agrovet) => agrovet.isPremiumPartner).length;
  const deliveryCount = registeredAgrovets.filter((agrovet) => agrovet.offersDelivery).length;
  const stockCount = registeredAgrovets.filter((agrovet) => agrovet.hasTreatmentInStock).length;
  const selectedAgrovet =
    nearbyAgrovets.find((agrovet) => agrovet.id === selectedAgrovetId) ??
    registeredAgrovets.find((agrovet) => agrovet.id === selectedAgrovetId) ??
    recommendedAgrovets.find((agrovet) => agrovet.id === selectedAgrovetId) ??
    null;
  const shellClass = isLight
    ? "w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-xl"
    : "w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-slate-100 shadow-xl";
  const headerClass = isLight
    ? "border-b border-slate-200 bg-slate-50 p-6 md:p-8"
    : "border-b border-white/10 bg-slate-900 p-6 md:p-8";

  return (
    <section className={shellClass}>
      <div className={headerClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {text.badge}
            </div>
            <h2 className={`mt-3 text-2xl font-semibold ${isLight ? "text-slate-950" : "text-white"}`}>
              {text.title}
            </h2>
            <p className={`mt-1 max-w-2xl text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              {text.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className={`grid grid-cols-3 gap-2 rounded-lg border p-2 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="px-3 py-2 text-center">
                <p className={`text-lg font-bold ${isLight ? "text-slate-950" : "text-white"}`}>{premiumCount}</p>
                <p className="text-[10px] uppercase text-slate-500">{text.premium}</p>
              </div>
              <div className="px-3 py-2 text-center">
                <p className={`text-lg font-bold ${isLight ? "text-slate-950" : "text-white"}`}>{deliveryCount}</p>
                <p className="text-[10px] uppercase text-slate-500">{text.delivery}</p>
              </div>
              <div className="px-3 py-2 text-center">
                <p className={`text-lg font-bold ${isLight ? "text-slate-950" : "text-white"}`}>{stockCount}</p>
                <p className="text-[10px] uppercase text-slate-500">{text.inStock}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLanguage(language === "en" ? "sw" : "en")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${isLight ? "bg-slate-900 text-white" : "bg-white text-slate-950"}`}
              >
                {language === "en" ? "SW" : "EN"}
              </button>
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold ${isLight ? "bg-emerald-500 text-white" : "bg-emerald-400 text-slate-950"}`}
              >
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        </div>

        <div className={`mt-5 flex flex-wrap items-center gap-2 text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
            {locationMode === "locating" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" aria-hidden="true" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            )}
            {locationMode === "live"
              ? text.liveGps
              : locationMode === "fallback"
                ? text.fallbackGps
                : text.locating}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
            <PackageCheck className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
            {text.treatment}: {cleanTreatment}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
            <Crown className="h-3.5 w-3.5 text-purple-300" aria-hidden="true" />
            {text.recommended}: {recommendedAgrovets.length}
          </span>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {([
            ["recommended", `${text.recommended} (${recommendedAgrovets.length})`],
            ["registered", `${text.registered} (${registeredAgrovets.length})`],
            ["nearby", `${text.nearby} (${nearbyAgrovets.length})`],
          ] as Array<[Section, string]>).map(([section, label]) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`rounded-lg border px-4 py-3 text-sm font-bold transition ${
                activeSection === section
                  ? "border-emerald-300 bg-emerald-400 text-slate-950"
                  : isLight
                    ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-300/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 md:p-8">
        {isLoading ? (
          <MarketplaceSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-red-100">{text.marketplaceUnavailable}</h3>
                <p className="mt-1 text-sm text-red-200">{error}</p>
              </div>
            </div>
          </div>
        ) : agrovets.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-slate-600" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-white">{text.noAgrovets}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {text.noAgrovetsHelp}
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            {activeSection === "nearby" && selectedAgrovet && (
              <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-h-[320px] bg-slate-950">
                  <iframe
                    key={selectedAgrovet.id}
                    title={`Map location for ${selectedAgrovet.name}`}
                    src={buildMapEmbedUrl(selectedAgrovet.lat, selectedAgrovet.lng)}
                    className="h-[360px] w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <aside className="border-t border-white/10 p-6 lg:border-l lg:border-t-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
                    {text.exactLocation}
                  </div>

                  <h3 className="mt-4 text-2xl font-bold text-white">{selectedAgrovet.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{selectedAgrovet.address}</p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {text.distance}
                      </p>
                      <p className="mt-1 text-base font-bold text-white">
                        {formatDistance(selectedAgrovet.distanceKm)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {text.coordinates}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-white">
                        {selectedAgrovet.lat.toFixed(5)}, {selectedAgrovet.lng.toFixed(5)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <a
                      href={buildGoogleMapsDirectionsUrl(
                        selectedAgrovet.lat,
                        selectedAgrovet.lng,
                        farmerLocation,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                    >
                      <Navigation className="h-4 w-4" aria-hidden="true" />
                      {text.getDirections}
                    </a>
                    <a
                      href={buildGoogleMapsPlaceUrl(selectedAgrovet.lat, selectedAgrovet.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {text.openMaps}
                    </a>
                  </div>

                  <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
                    <LocateFixed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    {text.mapHelp}
                  </p>
                </aside>
              </div>
            )}

            <div className="grid gap-6">
            {visibleAgrovets.map((agrovet, index) => {
              const inventoryItems = agrovet.medicineInventory;
              const hasExactTreatment = agrovet.hasTreatmentInStock;
              const normalizedTreatment = normalizeTreatment(cleanTreatment);
              const statusItems = [
                agrovet.isPremiumPartner ? text.verified : null,
                agrovet.offersDelivery ? text.deliveryAvailable : null,
                hasExactTreatment ? `${cleanTreatment} ${text.inStock.toLowerCase()}` : text.noExplicit,
              ].filter(Boolean);

              return (
                <article
                  key={agrovet.id}
                  onClick={() => setSelectedAgrovetId(agrovet.id)}
                  className={`relative overflow-hidden rounded-2xl border bg-slate-900/90 p-4 transition md:p-5 ${
                    selectedAgrovetId === agrovet.id
                      ? "border-sky-300/60 shadow-[0_0_30px_-18px_rgba(125,211,252,0.9)]"
                      : agrovet.isPremiumPartner
                      ? "border-emerald-400/50 shadow-[0_0_30px_-18px_rgba(52,211,153,0.9)]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  {agrovet.isPremiumPartner && (
                    <div className="absolute inset-x-0 top-0 h-px bg-emerald-300/80" />
                  )}

                  <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <aside className="rounded-xl border border-white/10 bg-slate-950/60 p-5 md:p-6">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-emerald-300">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold leading-tight text-white">
                            {agrovet.name}
                          </h3>
                          {agrovet.isPremiumPartner && (
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-100 shadow-[0_0_22px_-10px_rgba(52,211,153,0.9)]">
                              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              {text.verified}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {text.location}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{agrovet.address}</p>
                          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {formatDistance(agrovet.distanceKm)} away
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-[10px] font-semibold uppercase text-slate-500">
                              {text.delivery}
                            </p>
                            <p className="mt-1 text-sm font-bold text-white">
                              {agrovet.offersDelivery ? text.available : text.pickup}
                            </p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-[10px] font-semibold uppercase text-slate-500">
                              {text.platformFee}
                            </p>
                            <p className="mt-1 text-sm font-bold text-white">
                              {agrovet.offersDelivery
                                ? formatFee(agrovet.deliveryCommissionRate)
                                : "None"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedAgrovetId(agrovet.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15"
                        >
                          <MapPinned className="h-4 w-4" aria-hidden="true" />
                          {text.viewMap}
                        </button>
                      <a
                        href={agrovet.phone ? `tel:${agrovet.phone}` : undefined}
                        onClick={(event) => event.stopPropagation()}
                        aria-disabled={!agrovet.phone}
                          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                          agrovet.phone
                            ? "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                            : "pointer-events-none border border-white/10 bg-white/[0.02] text-slate-600"
                        }`}
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {agrovet.phone ? text.callStore : text.noPhone}
                      </a>

                      {agrovet.offersDelivery && (
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                        >
                          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                          {text.orderDeliver}
                        </button>
                      )}
                      </div>
                    </aside>

                    <div className="space-y-6 p-1 md:p-2">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <PackageCheck className="h-4 w-4 text-sky-300" aria-hidden="true" />
                            <span className="text-xs font-semibold uppercase tracking-wider">
                              {text.treatmentMatch}
                            </span>
                          </div>
                          <p
                            className={`mt-3 text-lg font-bold ${
                              hasExactTreatment ? "text-emerald-300" : "text-amber-300"
                            }`}
                          >
                            {hasExactTreatment ? text.inStock : text.noExact}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Truck className="h-4 w-4 text-purple-300" aria-hidden="true" />
                            <span className="text-xs font-semibold uppercase tracking-wider">
                              {text.deliveryLoop}
                            </span>
                          </div>
                          <p className="mt-3 text-lg font-bold text-white">
                            {agrovet.offersDelivery ? "30 min est." : text.notOffered}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock3 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                            <span className="text-xs font-semibold uppercase tracking-wider">
                              {text.rank}
                            </span>
                          </div>
                          <p className="mt-3 text-lg font-bold text-white">
                            {agrovet.marketplaceRank === 1 ? text.boosted : text.distanceRank}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h4 className="text-base font-semibold text-white">
                              {text.inventory}
                            </h4>
                            <p className="mt-1 text-sm text-slate-500">
                              {text.inventoryHelp}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-slate-400">
                            {inventoryItems.length} {text.listed}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {inventoryItems.length > 0 ? (
                            inventoryItems.map((item) => {
                              const matchesTreatment =
                                normalizeTreatment(item).includes(normalizedTreatment) ||
                                normalizedTreatment.includes(normalizeTreatment(item));

                              return (
                                <span
                                  key={item}
                                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                                    matchesTreatment
                                      ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                                      : "border-white/10 bg-white/[0.04] text-slate-300"
                                  }`}
                                >
                                  {matchesTreatment && (
                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                  )}
                                  {item}
                                </span>
                              );
                            })
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-500">
                              {text.notPublished}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
                        {statusItems.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
