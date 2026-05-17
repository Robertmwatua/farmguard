"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

interface AgrovetRecord {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  distanceKm: number;
  isPremiumPartner: boolean;
  offersDelivery: boolean;
  medicineInventory: string[];
  hasTreatmentInStock: boolean;
}

interface AgrovetResponse {
  registeredAgrovets?: AgrovetRecord[];
}

const defaultForm = {
  shopName: "",
  ownerName: "",
  phoneNumber: "",
  physicalAddress: "",
  latitude: "",
  longitude: "",
  medicineInventory: "fungicide, copper oxychloride, mancozeb",
  offersDelivery: true,
  isPremiumPartner: false,
};

export default function AgrovetsAdminPage() {
  const [agrovets, setAgrovets] = useState<AgrovetRecord[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAgrovets() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/agrovets?treatmentNeeded=fungicide", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load registered agrovets.");
      }

      const payload = (await response.json()) as AgrovetResponse;
      setAgrovets(payload.registeredAgrovets ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load agrovets.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAgrovets();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/agrovets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to register agrovet.");
      }

      setForm(defaultForm);
      setMessage("Agrovet registered successfully.");
      await loadAgrovets();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to register agrovet.");
    } finally {
      setIsSaving(false);
    }
  }

  const stats = useMemo(
    () => ({
      total: agrovets.length,
      premium: agrovets.filter((agrovet) => agrovet.isPremiumPartner).length,
      delivery: agrovets.filter((agrovet) => agrovet.offersDelivery).length,
    }),
    [agrovets],
  );

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-200">
      <main className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <p className="mb-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Agrovet operations
            </p>
            <h1 className="text-4xl font-bold text-white">Registration & Monitoring</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Add real agrovet partners, monitor available stores, and confirm inventory before
              farmers see them after a scan.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-2">
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-zinc-500">Registered</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.premium}</p>
              <p className="text-xs text-zinc-500">Premium</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.delivery}</p>
              <p className="text-xs text-zinc-500">Delivery</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/70 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Plus className="h-5 w-5 text-emerald-400" />
              Register Agrovet
            </h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {[
                ["shopName", "Shop name"],
                ["ownerName", "Owner name"],
                ["phoneNumber", "Phone number"],
                ["physicalAddress", "Physical address"],
                ["latitude", "Latitude"],
                ["longitude", "Longitude"],
                ["medicineInventory", "Medicine inventory, comma separated"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm font-medium text-zinc-400">{label}</span>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
                  />
                </label>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.offersDelivery}
                    onChange={(event) => setForm({ ...form, offersDelivery: event.target.checked })}
                  />
                  Delivery
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPremiumPartner}
                    onChange={(event) =>
                      setForm({ ...form, isPremiumPartner: event.target.checked })
                    }
                  />
                  Premium
                </label>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-bold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save Agrovet
              </button>
            </form>

            {message && <p className="mt-4 text-sm font-medium text-emerald-300">{message}</p>}
            {error && <p className="mt-4 text-sm font-medium text-red-300">{error}</p>}
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Store className="h-5 w-5 text-emerald-400" />
              Registered Agrovets
            </h2>

            {isLoading ? (
              <div className="mt-8 flex items-center gap-3 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                Loading registered agrovets...
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {agrovets.map((agrovet) => (
                  <article
                    key={agrovet.id}
                    className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{agrovet.name}</h3>
                        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                          <MapPin className="h-4 w-4 text-emerald-400" />
                          {agrovet.address}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {agrovet.isPremiumPartner && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Premium
                            </span>
                          )}
                          {agrovet.offersDelivery && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-200">
                              <Truck className="h-3.5 w-3.5" />
                              Delivery
                            </span>
                          )}
                          {agrovet.hasTreatmentInStock && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Fungicide match
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-300">
                        {agrovet.distanceKm.toFixed(1)} km from default farm
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
