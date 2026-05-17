"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
  Smartphone,
  CreditCard,
  ChevronRight,
  Award,
  Compass
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

  // Checkout & Delivery states
  const [checkoutAgrovet, setCheckoutAgrovet] = useState<AgrovetMarketplaceRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "paypal" | "cod" | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"select_payment" | "mpesa_loading" | "tracking">("select_payment");
  const [mpesaPhone, setMpesaPhone] = useState("0712345678");
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [deliveryStatusText, setDeliveryStatusText] = useState("Order Confirmed");
  const [countdown, setCountdown] = useState(60);
  const [showRiderCallInfo, setShowRiderCallInfo] = useState(false);
  const [mockRiderChat, setMockRiderChat] = useState<{ sender: "rider" | "you"; text: string }[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [showChatPopup, setShowChatPopup] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (checkoutStep === "tracking" && checkoutAgrovet) {
      setMockRiderChat([
        { sender: "rider", text: language === "en" ? "Hi! I am Kamau, your delivery partner today. I'm picking up your package now!" : "Habari! Mimi ni Kamau, dereva wako leo. Nachukua dawa yako sasa hivi!" }
      ]);

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setTrackingProgress(100);
            setDeliveryStatusText(language === "en" ? "Treatment Delivered! Enjoy your harvest." : "Dawa Imewasilishwa! Furahia mavuno yako.");
            clearInterval(timer);
            return 0;
          }
          const nextCountdown = prev - 1;
          const progress = Math.round(((60 - nextCountdown) / 60) * 100);
          setTrackingProgress(progress);

          if (progress === 20) {
            setMockRiderChat(prevChat => [
              ...prevChat,
              { sender: "rider", text: language === "en" ? "I have picked up your treatment package and am heading to your farm now." : "Nimechukua dawa yako na ninaelekea shambani kwako sasa hivi." }
            ]);
          } else if (progress === 60) {
            setMockRiderChat(prevChat => [
              ...prevChat,
              { sender: "rider", text: language === "en" ? "I am turning onto the main farm road. Keep your phone close!" : "Nimefika kwenye barabara kuu ya kuelekea shambani. Weka simu karibu!" }
            ]);
          } else if (progress === 95) {
            setMockRiderChat(prevChat => [
              ...prevChat,
              { sender: "rider", text: language === "en" ? "I have arrived at your gate! Please meet me." : "Nimefika getini kwako! Karibu upokee mzigo wako." }
            ]);
          }

          if (progress < 25) {
            setDeliveryStatusText(language === "en" ? "Order Confirmed & Payment Received" : "Agizo Limethibitishwa na Malipo Yamepokelewa");
          } else if (progress < 50) {
            setDeliveryStatusText(language === "en" ? `Agrovet preparing: ${cleanTreatment}` : `Agrovet anaandaa: ${cleanTreatment}`);
          } else if (progress < 75) {
            setDeliveryStatusText(language === "en" ? "Rider Dispatched (Kamau - Plate: KMD 420Y)" : "Dereva Amepokea Mzigo (Kamau - Nambari: KMD 420Y)");
          } else {
            setDeliveryStatusText(language === "en" ? "Rider is in your neighborhood! Arriving soon." : "Dereva yuko karibu nawe! Anafika sasa hivi.");
          }

          return nextCountdown;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [checkoutStep, checkoutAgrovet, cleanTreatment, language]);

  const handleMpesaPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpesaPhone.trim()) return;
    setCheckoutStep("mpesa_loading");
    setTimeout(() => {
      setCheckoutStep("tracking");
    }, 3500);
  };

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
                          onClick={(event) => {
                            event.stopPropagation();
                            setCheckoutAgrovet(agrovet);
                            setCheckoutStep("select_payment");
                            setPaymentMethod(null);
                            setTrackingProgress(0);
                            setCountdown(60);
                            setShowChatPopup(false);
                            setShowRiderCallInfo(false);
                          }}
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

      {/* ── MPESA / PAYPAL CHECKOUT & UBER DELIVERY TRACKING SYSTEM ── */}
      <AnimatePresence>
        {checkoutAgrovet && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative text-zinc-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              {checkoutStep !== "mpesa_loading" && (
                <button
                  type="button"
                  onClick={() => setCheckoutAgrovet(null)}
                  className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* STEP 1: PAYMENT METHOD SELECTION */}
              {checkoutStep === "select_payment" && (
                <div className="space-y-6">
                  <div>
                    <span className="inline-block text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 mb-2">
                      FARMGUARD CHECKOUT
                    </span>
                    <h3 className="text-xl font-black text-white">
                      {language === "en" ? "Order & Delivery Checkout" : "Malipo na Uwasilishaji wa Dawa"}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {language === "en" ? `Fulfill your prescription medication with ${checkoutAgrovet.name}` : `Timiza agizo lako la matibabu na ${checkoutAgrovet.name}`}
                    </p>
                  </div>

                  {/* Pricing Summary */}
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2.5 font-sans">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>{language === "en" ? "Leaf Diagnostics Medication" : "Dawa ya Matibabu ya Majani"} ({cleanTreatment})</span>
                      <span className="font-bold text-white">Ksh 850</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>{language === "en" ? "Agrovet Express Delivery" : "Uwasilishaji wa Haraka wa Agrovet"}</span>
                      <span className="font-bold text-white">Ksh {checkoutAgrovet?.offersDelivery ? Math.round(checkoutAgrovet.deliveryCommissionRate * 1000) : 150}</span>
                    </div>
                    <div className="h-px bg-zinc-800 my-1" />
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-zinc-200">{language === "en" ? "Total Payable" : "Jumla ya Malipo"}</span>
                      <span className="text-emerald-400 font-extrabold">Ksh {850 + (checkoutAgrovet?.offersDelivery ? Math.round(checkoutAgrovet.deliveryCommissionRate * 1000) : 150)}</span>
                    </div>
                  </div>

                  {/* Payment Choices */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      {language === "en" ? "Select Secure Payment Method" : "Chagua Njia ya Malipo ya Salama"}
                    </h4>

                    {/* M-Pesa Option */}
                    <div
                      onClick={() => setPaymentMethod("mpesa")}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        paymentMethod === "mpesa"
                          ? "border-emerald-500 bg-emerald-500/5"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-black text-xs">
                          M
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">Lipa na M-Pesa</p>
                          <p className="text-[10px] text-zinc-400">Instant Safaricom STK Push</p>
                        </div>
                      </div>
                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        paymentMethod === "mpesa" ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-600"
                      }`}>
                        {paymentMethod === "mpesa" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    {/* PayPal Option */}
                    <div
                      onClick={() => setPaymentMethod("paypal")}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        paymentMethod === "paypal"
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">PayPal / Credit Card</p>
                          <p className="text-[10px] text-zinc-400">Global PayPal secure checkout</p>
                        </div>
                      </div>
                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        paymentMethod === "paypal" ? "border-blue-400 bg-blue-400 text-zinc-950" : "border-zinc-600"
                      }`}>
                        {paymentMethod === "paypal" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    {/* Pay on Delivery Option */}
                    <div
                      onClick={() => setPaymentMethod("cod")}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        paymentMethod === "cod"
                          ? "border-zinc-400 bg-zinc-850"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-300">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{language === "en" ? "Pay After Delivery" : "Lipa Ukipokea Mzigo"}</p>
                          <p className="text-[10px] text-zinc-400">Cash / Mobile money to rider upon delivery</p>
                        </div>
                      </div>
                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        paymentMethod === "cod" ? "border-zinc-300 bg-zinc-300 text-zinc-950" : "border-zinc-600"
                      }`}>
                        {paymentMethod === "cod" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Payment selection contextual forms */}
                  {paymentMethod === "mpesa" && (
                    <form onSubmit={handleMpesaPaySubmit} className="space-y-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <label className="block">
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                          Safaricom M-Pesa Phone Number
                        </span>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">+254</span>
                          <input
                            type="tel"
                            required
                            value={mpesaPhone}
                            onChange={(e) => setMpesaPhone(e.target.value)}
                            placeholder="e.g. 712345678"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500/40"
                          />
                        </div>
                      </label>
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs transition"
                      >
                        {language === "en" ? "Send M-Pesa STK Push" : "Tuma Ombi la M-Pesa (STK)"}
                      </button>
                    </form>
                  )}

                  {paymentMethod === "paypal" && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        PayPal coming soon!
                      </p>
                      <p className="text-zinc-400 text-[10px]">
                        Please use Lipa na M-Pesa or Pay After Delivery options to simulate your delivery order today.
                      </p>
                    </div>
                  )}

                  {paymentMethod === "cod" && (
                    <button
                      onClick={() => setCheckoutStep("tracking")}
                      className="w-full py-3.5 bg-zinc-200 hover:bg-zinc-100 text-zinc-950 font-black rounded-xl text-xs transition"
                    >
                      {language === "en" ? "Confirm Order & Pay After Delivery" : "Thibitisha Agizo na Lipa Baadaye"}
                    </button>
                  )}
                </div>
              )}

              {/* STEP 2: MPESA STK LOADING PROMPT */}
              {checkoutStep === "mpesa_loading" && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    <Smartphone className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">M-Pesa STK push simulated</h3>
                    <p className="text-xs text-emerald-400 font-bold mt-1">Lipa na M-Pesa is coming soon!</p>
                    <p className="text-xs text-zinc-400 max-w-sm mt-3 leading-relaxed">
                      We have sent a mock STK Pin verification prompt to mobile number <b className="text-zinc-200">+254 {mpesaPhone}</b>. Confirm the STK prompt on your handset to continue.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: UBER-STYLE LIVE DELIVERY TRACKING */}
              {checkoutStep === "tracking" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        <Truck className="w-3 h-3" /> {language === "en" ? "EXPRESS DELIVERY ACTIVE" : "UPELEKASHAJI JUU KASI"}
                      </span>
                      <h3 className="text-lg font-black text-white mt-1.5">
                        {deliveryStatusText}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        {language === "en" ? `Express crop medicine order from ${checkoutAgrovet.name}` : `Agizo la haraka la dawa kutoka ${checkoutAgrovet.name}`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{language === "en" ? "Est. Arrival" : "Muda Wakufika"}</span>
                      <span className="text-xl font-black text-emerald-400 block mt-0.5">{countdown > 0 ? `${countdown}s` : (language === "en" ? "Arrived!" : "Imefika!")}</span>
                    </div>
                  </div>

                  {/* Delivery Timeline Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <span>{language === "en" ? "Confirmed" : "Thibitishwa"}</span>
                      <span>{language === "en" ? "Dispatched" : "Imesafirishwa"}</span>
                      <span>{language === "en" ? "Delivered" : "Imewasilishwa"}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden border border-zinc-700/50">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        style={{ width: `${trackingProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Live SVG Vector Map Grid and Motorcycle Animation */}
                  <div className="relative">
                    <svg className="w-full h-44 bg-zinc-950 rounded-2xl border border-zinc-800 relative overflow-hidden" viewBox="0 0 300 200">
                      {/* grid background pattern */}
                      <defs>
                        <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#18181b" strokeWidth="0.8" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#gridPattern)" />
                      
                      {/* Dotted paths representing roads */}
                      <path d="M 40 160 H 220 V 40" fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
                      <path
                        d="M 40 160 H 220 V 40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        className="opacity-60"
                      />

                      {/* Store Node (Source) */}
                      <g transform="translate(40, 160)">
                        <circle r="12" fill="#10b981" fillOpacity="0.15" className="animate-ping" />
                        <circle r="6" fill="#10b981" />
                        <text y="-14" textAnchor="middle" fill="#a7f3d0" fontSize="7" fontWeight="black" className="font-sans tracking-wide">AGROVET</text>
                      </g>

                      {/* Farmer Node (Destination) */}
                      <g transform="translate(220, 40)">
                        <circle r="12" fill="#3b82f6" fillOpacity="0.15" className="animate-ping" />
                        <circle r="6" fill="#3b82f6" />
                        <text y="-14" textAnchor="middle" fill="#bfdbfe" fontSize="7" fontWeight="black" className="font-sans tracking-wide">YOUR FARM</text>
                      </g>

                      {/* Motocycle Marker along path */}
                      <g transform={`translate(${
                        trackingProgress < 50
                          ? 40 + (220 - 40) * (trackingProgress / 50)
                          : 220
                      }, ${
                        trackingProgress < 50
                          ? 160
                          : 160 - (160 - 40) * ((trackingProgress - 50) / 50)
                      })`}>
                        <circle r="10" fill="#f59e0b" fillOpacity="0.25" className="animate-pulse" />
                        <circle r="6" fill="#f59e0b" />
                        <text textAnchor="middle" y="3" fontSize="10">🏍️</text>
                      </g>
                    </svg>

                    <div className="absolute bottom-2 right-2 bg-zinc-900/90 border border-zinc-800/80 px-2 py-1 rounded-md text-[9px] text-zinc-400 font-semibold tracking-wider flex items-center gap-1 select-none">
                      <Compass className="w-3 h-3 text-emerald-400 animate-spin" />
                      SIMULATED LIVE GPS RADAR
                    </div>
                  </div>

                  {/* Rider Profile Card & Action Center */}
                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-sm relative">
                        K
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-zinc-900" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-white text-xs">Kamau</h5>
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-zinc-800 px-1 py-0.5 rounded text-amber-400 font-black">
                            ★ 4.9
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">Honda Rider • <b className="text-zinc-300">KMD 420Y</b></p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Rider Chat Option */}
                      <button
                        type="button"
                        onClick={() => setShowChatPopup(true)}
                        className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-emerald-500/20 text-zinc-400 hover:text-white transition relative"
                        title="Chat with Rider"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {mockRiderChat.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400" />
                        )}
                      </button>

                      {/* Call Rider Option */}
                      <button
                        type="button"
                        onClick={() => setShowRiderCallInfo(!showRiderCallInfo)}
                        className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-emerald-500/20 text-zinc-400 hover:text-white transition"
                        title="Call Rider"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rider Dial info overlay */}
                  {showRiderCallInfo && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold text-center animate-pulse">
                      📞 Dialing Kamau at +254 712 345 678... (Simulated connection)
                    </div>
                  )}

                  {/* Complete Order Closing Closeout */}
                  {trackingProgress === 100 && (
                    <button
                      type="button"
                      onClick={() => setCheckoutAgrovet(null)}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs transition"
                    >
                      {language === "en" ? "Close Tracker" : "Funga Tracker"}
                    </button>
                  )}
                </div>
              )}

              {/* RIDER REAL-TIME CHAT POPUP SYSTEM */}
              {showChatPopup && (
                <div className="absolute inset-0 z-20 bg-zinc-950 flex flex-col justify-between p-6">
                  {/* Chat header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs">
                        K
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">Kamau (Rider)</h4>
                        <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Online
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowChatPopup(false)}
                      className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Chat logs */}
                  <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 text-xs">
                    {mockRiderChat.map((chat, idx) => (
                      <div key={idx} className={`flex ${chat.sender === "you" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl ${
                          chat.sender === "you"
                            ? "bg-emerald-500 text-zinc-950 font-semibold rounded-tr-none"
                            : "bg-zinc-800 text-zinc-200 rounded-tl-none"
                        }`}>
                          {chat.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInputText.trim()) return;
                      setMockRiderChat(prev => [
                        ...prev,
                        { sender: "you", text: chatInputText.trim() }
                      ]);
                      const responseMsg = chatInputText.trim();
                      setChatInputText("");
                      // Simulate quick automatic rider reply!
                      setTimeout(() => {
                        setMockRiderChat(prev => [
                          ...prev,
                          { sender: "rider", text: language === "en" ? `Got it! I am speeding up for your delivery. Thank you Robert!` : `Nimekupata! Ninaharakisha uwasilishaji wako. Asante Robert!` }
                        ]);
                      }, 2000);
                    }}
                    className="flex gap-2 shrink-0 pt-2 border-t border-zinc-800"
                  >
                    <input
                      type="text"
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      placeholder="Type a message to Kamau..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold text-xs"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
