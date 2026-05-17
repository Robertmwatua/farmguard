import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_LATITUDE = -1.2921;
const DEFAULT_LONGITUDE = 36.8219;
const MAX_RESULTS = 20;
const RECOMMENDED_RESULTS = 3;

interface AgrovetProfileRow {
  id: string;
  shop_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  store_name?: string | null;
  address?: string | null;
  physical_address?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  is_active?: boolean | null;
  is_open?: boolean | null;
  is_premium_partner?: boolean | null;
  offers_delivery?: boolean | null;
  delivery_commission_rate?: number | string | null;
  medicine_inventory?: string[] | string | null;
}

export interface AgrovetMarketplaceRecord {
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

function parseCoordinate(value: string | null, fallback: number): number {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : fallback;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInventory(value: AgrovetProfileRow["medicine_inventory"]): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function hasTreatment(inventory: string[], treatmentNeeded: string): boolean {
  const normalizedTreatment = normalizeText(treatmentNeeded);

  if (!normalizedTreatment) {
    return false;
  }

  return inventory.some((item) => {
    const normalizedItem = normalizeText(item);
    return (
      normalizedItem === normalizedTreatment ||
      normalizedItem.includes(normalizedTreatment) ||
      normalizedTreatment.includes(normalizedItem)
    );
  });
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const distance = 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(distance * 10) / 10;
}

function mapProfile(
  profile: AgrovetProfileRow,
  farmerLat: number,
  farmerLng: number,
  treatmentNeeded: string,
): AgrovetMarketplaceRecord | null {
  const lat = parseNumber(profile.latitude ?? profile.lat);
  const lng = parseNumber(profile.longitude ?? profile.lng);

  if (lat === null || lng === null) {
    return null;
  }

  const medicineInventory = parseInventory(profile.medicine_inventory);
  const hasTreatmentInStock = hasTreatment(medicineInventory, treatmentNeeded);
  const isPremiumPartner = profile.is_premium_partner === true;

  return {
    id: profile.id,
    name:
      profile.shop_name ??
      profile.business_name ??
      profile.store_name ??
      profile.name ??
      "Unnamed Agrovet",
    address: profile.physical_address ?? profile.address ?? "Address unavailable",
    phone: profile.phone ?? profile.phone_number ?? null,
    lat,
    lng,
    distanceKm: calculateDistanceKm(farmerLat, farmerLng, lat, lng),
    isPremiumPartner,
    offersDelivery: profile.offers_delivery === true,
    deliveryCommissionRate: parseNumber(profile.delivery_commission_rate) ?? 0.05,
    medicineInventory,
    hasTreatmentInStock,
    treatmentNeeded,
    marketplaceRank: isPremiumPartner && hasTreatmentInStock ? 1 : 2,
    isRegistered: true,
    source: "registered",
  };
}

function mapGeoapifyFeature(
  feature: any,
  farmerLat: number,
  farmerLng: number,
  treatmentNeeded: string,
): AgrovetMarketplaceRecord | null {
  const coords = feature?.geometry?.coordinates;
  const lng = Array.isArray(coords) ? parseNumber(coords[0]) : null;
  const lat = Array.isArray(coords) ? parseNumber(coords[1]) : null;

  if (lat === null || lng === null) {
    return null;
  }

  const props = feature?.properties ?? {};
  const addressParts = [
    props.address_line1,
    props.address_line2,
    props.city,
    props.state,
  ].filter(Boolean);

  return {
    id: props.place_id ?? `geoapify-${lat}-${lng}`,
    name: props.name ?? "Nearby Agrovet",
    address: addressParts.join(", ") || props.formatted || "Address unavailable",
    phone: props.contact?.phone ?? null,
    lat,
    lng,
    distanceKm: calculateDistanceKm(farmerLat, farmerLng, lat, lng),
    isPremiumPartner: false,
    offersDelivery: false,
    deliveryCommissionRate: 0,
    medicineInventory: [],
    hasTreatmentInStock: false,
    treatmentNeeded,
    marketplaceRank: 3,
    isRegistered: false,
    source: "live-nearby",
  };
}

async function fetchLiveNearbyAgrovets(
  farmerLat: number,
  farmerLng: number,
  treatmentNeeded: string,
): Promise<AgrovetMarketplaceRecord[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();

  if (!apiKey) {
    return [];
  }

  try {
    const geoUrl = new URL("https://api.geoapify.com/v2/places");
    geoUrl.searchParams.set("categories", "commercial.agricultural");
    geoUrl.searchParams.set("filter", `circle:${farmerLng},${farmerLat},15000`);
    geoUrl.searchParams.set("bias", `proximity:${farmerLng},${farmerLat}`);
    geoUrl.searchParams.set("limit", "20");
    geoUrl.searchParams.set("apiKey", apiKey);

    const response = await fetch(geoUrl.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const features: unknown[] = Array.isArray(payload?.features) ? payload.features : [];

    return features
      .map((feature) => mapGeoapifyFeature(feature, farmerLat, farmerLng, treatmentNeeded))
      .filter((record): record is AgrovetMarketplaceRecord => record !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (error) {
    console.warn("[agrovets] Geoapify nearby lookup failed:", error);
    return [];
  }
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { searchParams } = new URL(request.url);
  const farmerLat = parseCoordinate(searchParams.get("lat"), DEFAULT_LATITUDE);
  const farmerLng = parseCoordinate(searchParams.get("lng"), DEFAULT_LONGITUDE);
  const treatmentNeeded = searchParams.get("treatmentNeeded")?.trim() || "fungicide";

  const { data, error } = await supabase
    .from("agrovet_profiles")
    .select("*")
    .limit(100);

  if (error) {
    console.error("[agrovets] Supabase agrovet_profiles error:", error.message);
    return NextResponse.json(
      { error: "Agrovet marketplace data is unavailable right now." },
      { status: 502 },
    );
  }

  const registeredAgrovets = ((data as AgrovetProfileRow[] | null) ?? [])
    .filter((profile) => profile.is_active !== false)
    .filter((profile) => profile.is_open !== false)
    .map((profile) => mapProfile(profile, farmerLat, farmerLng, treatmentNeeded))
    .filter((profile): profile is AgrovetMarketplaceRecord => profile !== null)
    .sort((a, b) => {
      const priorityDifference = a.marketplaceRank - b.marketplaceRank;
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.distanceKm - b.distanceKm;
    })
    .slice(0, MAX_RESULTS);
  const liveNearbyAgrovets = await fetchLiveNearbyAgrovets(farmerLat, farmerLng, treatmentNeeded);
  const nearbyAgrovets =
    liveNearbyAgrovets.length > 0
      ? liveNearbyAgrovets
      : [...registeredAgrovets].sort((a, b) => a.distanceKm - b.distanceKm);
  const recommendedAgrovets = registeredAgrovets.slice(0, RECOMMENDED_RESULTS);

  return NextResponse.json(
    {
      agrovets: recommendedAgrovets,
      recommendedAgrovets,
      registeredAgrovets,
      nearbyAgrovets,
      treatmentNeeded,
      farmerLocation: {
        lat: farmerLat,
        lng: farmerLng,
      },
      source: liveNearbyAgrovets.length > 0 ? "supabase+geoapify" : "supabase:agrovet_profiles",
      distanceMethod: "haversine_km",
      monetizationRule: "premium_in_stock_first_then_distance",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const payload = await request.json();
    const shopName = String(payload.shopName ?? "").trim();
    const ownerName = String(payload.ownerName ?? "").trim();
    const phoneNumber = String(payload.phoneNumber ?? "").trim();
    const physicalAddress = String(payload.physicalAddress ?? "").trim();
    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);
    const inventory = Array.isArray(payload.medicineInventory)
      ? payload.medicineInventory
      : String(payload.medicineInventory ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    if (!shopName || !phoneNumber || !physicalAddress || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Shop name, phone number, physical address, latitude, and longitude are required." },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("agrovet_profiles")
      .insert([
        {
          user_id: user?.id ?? null,
          shop_name: shopName,
          business_name: shopName,
          store_name: shopName,
          name: shopName,
          owner_name: ownerName || null,
          phone_number: phoneNumber,
          phone: phoneNumber,
          physical_address: physicalAddress,
          address: physicalAddress,
          latitude,
          longitude,
          is_premium_partner: Boolean(payload.isPremiumPartner),
          offers_delivery: Boolean(payload.offersDelivery),
          delivery_commission_rate: Number(payload.deliveryCommissionRate ?? 0.05),
          medicine_inventory: inventory,
          is_open: true,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[agrovets] register error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agrovet: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to register agrovet." },
      { status: 500 },
    );
  }
}
