"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Mail, Lock, Loader2, AlertCircle, LogIn, ShieldCheck, ArrowRight, User, Store, Globe, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { translations } from "@/lib/translations";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Role selector (default to farmer, but user can click to switch)
  const [selectedRole, setSelectedRole] = useState<"farmer" | "agrovet">("farmer");

  // Multi-language & Theme support
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw';
    if (savedLang) setLang(savedLang);

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    const finalTheme = savedTheme || 'dark';
    setTheme(finalTheme);
    document.documentElement.classList.toggle('light', finalTheme === 'light');
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(
            signInError.message === "Invalid login credentials"
              ? "Incorrect email or password. Please try again."
              : signInError.message,
          );
          setLoading(false);
          return;
        }

        // Fetch user metadata to confirm role
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError("Failed to fetch user profile.");
          setLoading(false);
          return;
        }

        const role = user.user_metadata?.role || "farmer";

        // Route accordingly
        if (role === "agrovet") {
          window.location.replace("/agrovets");
        } else {
          window.location.replace("/dashboard");
        }
      } catch {
        setError("An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    },
    [email, password],
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 py-12 transition-colors duration-300">
      
      {/* Quick settings in top corner */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button 
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all text-xs font-semibold"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          {lang === 'en' ? '🇬🇧 EN' : '🇰🇪 SW'}
        </button>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-85 transition-opacity">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
        </div>
        <span className="font-bold text-white tracking-wide text-xl">{t.brand}</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{t.welcomeBack}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">{t.loginDesc}</p>
        </div>

        {/* Role Selection Switch Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setSelectedRole("farmer")}
            className={`flex flex-col items-center p-3 rounded-xl border transition-all text-left ${
              selectedRole === "farmer"
                ? "border-emerald-500 bg-emerald-500/5 text-white"
                : "border-zinc-800 hover:border-zinc-700 text-zinc-400"
            }`}
          >
            <User className={`h-5 w-5 mb-1.5 ${selectedRole === "farmer" ? "text-emerald-400" : "text-zinc-500"}`} />
            <span className="text-xs font-bold">{t.farmer}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSelectedRole("agrovet")}
            className={`flex flex-col items-center p-3 rounded-xl border transition-all text-left ${
              selectedRole === "agrovet"
                ? "border-emerald-500 bg-emerald-500/5 text-white"
                : "border-zinc-800 hover:border-zinc-700 text-zinc-400"
            }`}
          >
            <Store className={`h-5 w-5 mb-1.5 ${selectedRole === "agrovet" ? "text-emerald-400" : "text-zinc-500"}`} />
            <span className="text-xs font-bold">{t.agrovet}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" aria-hidden="true" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder={selectedRole === 'farmer' ? 'farmer@farmguard.ai' : 'shop@agrovet.co.ke'}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-700 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" aria-hidden="true" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••"
                className="w-full rounded-lg border border-white/10 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-700 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 animate-shake">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2.5 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 rounded-xl font-bold text-sm transition-all shadow-[0_0_30px_-8px_rgba(16,185,129,0.35)] hover:shadow-[0_0_50px_-8px_rgba(16,185,129,0.55)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t.signingIn}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {t.signIn}
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          {t.noAccount}{" "}
          <Link href="/signup" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            {t.createOne} <ArrowRight className="inline h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
