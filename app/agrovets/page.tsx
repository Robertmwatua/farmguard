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
  Globe,
  Sun,
  Moon,
  LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { translations } from "@/lib/translations";

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

  // Multi-language & Theme support
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Sync lang & theme from storage
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw';
    if (savedLang) setLang(savedLang);

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    const finalTheme = savedTheme || 'dark';
    setTheme(finalTheme);
    document.documentElement.classList.toggle('light', finalTheme === 'light');

    const syncPreferences = () => {
      const currentLang = localStorage.getItem('lang') as 'en' | 'sw';
      if (currentLang) setLang(currentLang);
      const currentTheme = localStorage.getItem('theme') as 'dark' | 'light';
      if (currentTheme) {
        setTheme(currentTheme);
        document.documentElement.classList.toggle('light', currentTheme === 'light');
      }
    };
    window.addEventListener('storage', syncPreferences);
    window.addEventListener('local-storage', syncPreferences);

    return () => {
      window.removeEventListener('storage', syncPreferences);
      window.removeEventListener('local-storage', syncPreferences);
    };
  }, []);

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'sw' : 'en';
    setLang(nextLang);
    localStorage.setItem('lang', nextLang);
    window.dispatchEvent(new Event('local-storage'));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
    window.dispatchEvent(new Event('local-storage'));
  };

  const t = translations[lang];

  // Protect route
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!sessionData.session) {
        window.location.replace("/login");
        return;
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadAgrovets() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/agrovets?treatmentNeeded=fungicide", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(lang === 'en' ? "Unable to load registered agrovets." : "Imeshindwa kupakia agrovets zilizosajiliwa.");
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
        throw new Error(payload?.error ?? (lang === 'en' ? "Unable to register agrovet." : "Imeshindwa kusajili agrovet."));
      }

      setForm(defaultForm);
      setMessage(lang === 'en' ? "Agrovet registered successfully." : "Agrovet imesajiliwa kikamilifu.");
      await loadAgrovets();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to register agrovet.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  const stats = useMemo(
    () => ({
      total: agrovets.length,
      premium: agrovets.filter((agrovet) => agrovet.isPremiumPartner).length,
      delivery: agrovets.filter((agrovet) => agrovet.offersDelivery).length,
    }),
    [agrovets],
  );

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-200 transition-colors duration-300">
      <main className="mx-auto max-w-7xl">
        
        {/* Navigation & Header Panel */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToDashboard}
              </Link>
            </div>
            
            <p className="mb-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {t.operations}
            </p>
            <h1 className="text-4xl font-bold text-white">{t.monitoring}</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              {t.monDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Lang switcher */}
            <button 
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all text-xs font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'en' ? '🇬🇧 EN' : '🇰🇪 SW'}
            </button>

            {/* Theme switcher */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Sign out */}
            <button 
              onClick={handleSignOut}
              className="p-2 rounded-lg border border-zinc-800 hover:border-red-500/30 hover:text-red-400 transition-all flex items-center gap-2"
              title={t.signOut}
            >
              <LogOut className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-2 ml-4">
              <div className="px-4 py-1.5 text-center">
                <p className="text-xl font-bold text-white">{stats.total}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Reg</p>
              </div>
              <div className="px-4 py-1.5 text-center">
                <p className="text-xl font-bold text-white">{stats.premium}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Prem</p>
              </div>
              <div className="px-4 py-1.5 text-center">
                <p className="text-xl font-bold text-white">{stats.delivery}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Deliv</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          
          {/* Registration Form */}
          <section className="rounded-3xl border border-white/10 bg-zinc-900/70 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Plus className="h-5 w-5 text-emerald-400" />
              {t.registerAgrovet}
            </h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {[
                ["shopName", lang === 'en' ? "Shop name" : "Jina la Duka"],
                ["ownerName", lang === 'en' ? "Owner name" : "Jina la Mmiliki"],
                ["phoneNumber", lang === 'en' ? "Phone number" : "Nambari ya Simu"],
                ["physicalAddress", lang === 'en' ? "Physical address" : "Anwani ya Mahali"],
                ["latitude", "Latitude"],
                ["longitude", "Longitude"],
                ["medicineInventory", lang === 'en' ? "Medicine inventory, comma separated" : "Orodha ya dawa, tenganisha kwa koma"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                  />
                </label>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.offersDelivery}
                    onChange={(event) => setForm({ ...form, offersDelivery: event.target.checked })}
                    className="accent-emerald-400"
                  />
                  {t.delivery}
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isPremiumPartner}
                    onChange={(event) =>
                      setForm({ ...form, isPremiumPartner: event.target.checked })
                    }
                    className="accent-emerald-400"
                  />
                  {t.premium}
                </label>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-bold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t.saveAgrovet}
              </button>
            </form>

            {message && <p className="mt-4 text-sm font-medium text-emerald-300 animate-fade-in">{message}</p>}
            {error && <p className="mt-4 text-sm font-medium text-red-300 animate-shake">{error}</p>}
          </section>

          {/* Registered List */}
          <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Store className="h-5 w-5 text-emerald-400" />
              {t.registeredAgrovets}
            </h2>

            {isLoading ? (
              <div className="mt-8 flex items-center gap-3 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                {t.loadingAgrovets}
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {agrovets.map((agrovet) => (
                  <article
                    key={agrovet.id}
                    className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 hover:border-emerald-500/30 transition-colors"
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
                              {t.premium}
                            </span>
                          )}
                          {agrovet.offersDelivery && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-200">
                              <Truck className="h-3.5 w-3.5" />
                              {t.delivery}
                            </span>
                          )}
                          {agrovet.hasTreatmentInStock && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t.fungicideMatch}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-300">
                        {agrovet.distanceKm.toFixed(1)} {t.distanceFrom}
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
