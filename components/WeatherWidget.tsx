"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Cloud,
  CloudRain,
  Droplets,
  Leaf,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import type { WeatherApiResponse, WeatherCondition } from "../types/weather";

type Language = "en" | "sw";

const copy = {
  en: {
    advisoryUnavailable: "Weather advisory unavailable",
    currentConditionFallback: "Current conditions",
    feelsLike: "Feels like",
    forecastTitle: "3-Day Forecast",
    humidity: "Humidity",
    loadingError: "Unable to load weather and microclimate insights.",
    rain: "Rain",
    switchLabel: "Language",
    temperature: "Temperature",
    title: "Weather & Microclimate",
    advisoryTitle: "FarmGuard Weather Advisory",
    wind: "Wind",
    takeawayTitle: "Quick Farm Takeaways",
    takeawayRain:
      "🌧️ Rain is coming: Stop all chemical sprays right now so they don't wash away.",
    takeawayLateBlight:
      "🍅 Late Blight Alert: High humidity tonight means you must check your tomato leaves first thing tomorrow.",
    takeawayHighWind:
      "💨 Wind advisory: Hold all spraying — chemicals will drift and miss their target.",
    takeawayGoodWindow:
      "☀️ Good farming window: Safe to scout, irrigate, and apply treatments as planned.",
    stableInsight: "Weather conditions are stable. Continue routine crop scouting and soil checks.",
    highHumidityInsight:
      "⚠️ High humidity detected. Conditions are critical for the spread of oomycete pathogens like Late Blight. Monitor leaf wetness.",
    highWindInsight:
      "⚠️ High wind speed. Delay any planned fungicide/pesticide spraying to avoid chemical drift.",
    sunnyInsight: "🌱 Favorable weather for field maintenance and controlled irrigation.",
  },
  sw: {
    advisoryUnavailable: "Tahadhari ya hali ya hewa haipatikani",
    currentConditionFallback: "Hali ya sasa",
    feelsLike: "Inahisiwa kama",
    forecastTitle: "Utabiri wa Siku 3",
    humidity: "Unyevunyevu",
    loadingError: "Imeshindikana kupakia hali ya hewa na ushauri wa mikroklima.",
    rain: "Mvua",
    switchLabel: "Lugha",
    temperature: "Joto",
    title: "Hali ya Hewa na Mikroklima",
    advisoryTitle: "Ushauri wa Hali ya Hewa wa FarmGuard",
    wind: "Upepo",
    takeawayTitle: "Muhtasari wa Haraka kwa Mkulima",
    takeawayRain:
      "🌧️ Mvua inakuja: Simamia unyunyiziaji wa kemikali ili kuepuka kusafuka.",
    takeawayLateBlight:
      "🍅 Onyo la Late Blight: Unyevunyevu mwingi usiku huu — angalia majani ya nyanya asubuhi inayofuata.",
    takeawayHighWind:
      "💨 Upepo mkali: Shikilia upuliziaji, kemikali itapotoshwa na kuondoka mpaka shambani jirani.",
    takeawayGoodWindow:
      "☀️ Dirisha zuri la kazi shambani: Ni salama kukagua mazao, kumwagilia, na kutumia tiba inapohitajika.",
    stableInsight:
      "Hali ya hewa ni tulivu. Endelea kukagua mazao na hali ya udongo mara kwa mara.",
    highHumidityInsight:
      "⚠️ Unyevunyevu mwingi umegunduliwa. Hali hii ni hatari kwa kuenea kwa vimelea aina ya oomycete kama Late Blight. Fuatilia unyevunyevu kwenye majani.",
    highWindInsight:
      "⚠️ Kasi ya upepo ni kubwa. Ahirisha upuliziaji wa dawa za kuvu au wadudu ili kuepuka kusambaa kwa kemikali.",
    sunnyInsight: "🌱 Hali ya hewa ni nzuri kwa matengenezo ya shamba na umwagiliaji uliodhibitiwa.",
  },
} satisfies Record<Language, Record<string, string>>;

function getWeatherIcon(condition: WeatherCondition) {
  if (condition === "rain" || condition === "drizzle" || condition === "thunderstorm") {
    return CloudRain;
  }

  if (condition === "clear") {
    return Sun;
  }

  return Cloud;
}

function formatForecastDate(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function translateCondition(condition: WeatherCondition, label: string, language: Language): string {
  if (language === "en") {
    return label;
  }

  const labels: Record<WeatherCondition, string> = {
    clear: "Anga safi",
    clouds: "Mawingu",
    rain: "Mvua",
    drizzle: "Manyunyu",
    thunderstorm: "Mvua ya radi",
    snow: "Theluji",
    mist: "Ukungu",
    unknown: copy.sw.currentConditionFallback,
  };

  return labels[condition];
}

function isRainCondition(condition: WeatherCondition): boolean {
  return condition === "rain" || condition === "drizzle" || condition === "thunderstorm";
}

function buildLocalizedInsights(weather: WeatherApiResponse, language: Language): string[] {
  const text = copy[language];
  const insights: string[] = [];

  if (weather.current.humidityPercent > 80 || isRainCondition(weather.current.condition)) {
    insights.push(text.highHumidityInsight);
  }

  if (weather.current.windSpeedKmh > 20) {
    insights.push(text.highWindInsight);
  }

  if (weather.current.condition === "clear") {
    insights.push(text.sunnyInsight);
  }

  return insights.length > 0 ? insights : [text.stableInsight];
}

function buildFarmerSummary(weather: WeatherApiResponse, language: Language): string[] {
  const text = copy[language];
  const entries: string[] = [];

  // Rain condition — high priority
  if (isRainCondition(weather.current.condition)) {
    entries.push(text.takeawayRain);
  }

  // Late Blight: humidity > 80 AND cool temperature 10–20°C
  if (
    weather.current.humidityPercent > 80 &&
    weather.current.temperatureCelsius >= 10 &&
    weather.current.temperatureCelsius <= 20
  ) {
    entries.push(text.takeawayLateBlight);
  }

  // High wind — drift risk
  if (weather.current.windSpeedKmh > 15) {
    entries.push(text.takeawayHighWind);
  }

  // Good farming window: clear + calm winds (only if no alerts already)
  if (
    weather.current.condition === "clear" &&
    weather.current.windSpeedKmh <= 15 &&
    entries.length === 0
  ) {
    entries.push(text.takeawayGoodWindow);
  }

  if (entries.length === 0) {
    entries.push(text.stableInsight);
  }

  return entries.slice(0, 3);
}

function WeatherSkeleton({ language }: { language: Language }) {
  const text = copy[language];

  return (
    <section className="w-full rounded-lg border border-white/10 bg-slate-950 p-5 shadow-xl">
      <div className="mb-5 flex justify-end">
        <LanguageSwitch language={language} onLanguageChange={() => undefined} disabled />
      </div>
      <span className="sr-only">{text.title}</span>
      <div className="animate-pulse space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-white/10" />
            <div className="h-8 w-56 rounded bg-white/10" />
          </div>
          <div className="h-14 w-14 rounded-full bg-white/10" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-lg bg-white/10" />
          <div className="h-20 rounded-lg bg-white/10" />
          <div className="h-20 rounded-lg bg-white/10" />
        </div>
        <div className="h-28 rounded-lg bg-white/10" />
      </div>
    </section>
  );
}

function LanguageSwitch({
  disabled = false,
  language,
  onLanguageChange,
}: {
  disabled?: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  return (
    <div className="flex items-center gap-2" aria-label={copy[language].switchLabel}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onLanguageChange("en")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          language === "en"
            ? "bg-emerald-400 text-slate-950"
            : "bg-white/5 text-slate-300 hover:bg-white/10"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        EN
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onLanguageChange("sw")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          language === "sw"
            ? "bg-emerald-400 text-slate-950"
            : "bg-white/5 text-slate-300 hover:bg-white/10"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        SW
      </button>
    </div>
  );
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherApiResponse | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const text = copy[language];

  useEffect(() => {
    const controller = new AbortController();

    async function loadWeather(latitude?: number, longitude?: number) {
      const hasCoordinates = latitude !== undefined && longitude !== undefined;
      const params = hasCoordinates
        ? `?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
        : "";

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/weather${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Weather data is unavailable right now.");
        }

        const payload = (await response.json()) as WeatherApiResponse;
        setWeather(payload);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setError(copy.en.loadingError);
      } finally {
        setIsLoading(false);
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void loadWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          void loadWeather();
        },
        { maximumAge: 300000, timeout: 5000 },
      );
    } else {
      void loadWeather();
    }

    return () => controller.abort();
  }, []);

  const CurrentIcon = useMemo(
    () => getWeatherIcon(weather?.current.condition ?? "unknown"),
    [weather?.current.condition],
  );
  const localizedInsights = useMemo(
    () => (weather ? buildLocalizedInsights(weather, language) : []),
    [language, weather],
  );
  const farmerSummary = useMemo(
    () => (weather ? buildFarmerSummary(weather, language) : []),
    [language, weather],
  );

  if (isLoading) {
    return <WeatherSkeleton language={language} />;
  }

  if (error || !weather) {
    return (
      <section className="w-full rounded-lg border border-red-500/30 bg-slate-950 p-5 text-red-100 shadow-xl">
        <div className="mb-4 flex justify-end">
          <LanguageSwitch language={language} onLanguageChange={setLanguage} />
        </div>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-300" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold">{text.advisoryUnavailable}</h2>
            <p className="mt-1 text-sm text-red-200">
              {language === "sw" ? text.loadingError : error}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-slate-100 shadow-xl">
      <div className="border-b border-white/10 bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-300">{text.title}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {weather.current.location}
              {weather.current.country ? `, ${weather.current.country}` : ""}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {translateCondition(
                weather.current.condition,
                weather.current.conditionLabel,
                language,
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-3">
            <LanguageSwitch language={language} onLanguageChange={setLanguage} />
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <CurrentIcon className="h-9 w-9 text-emerald-300" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-end gap-3">
          <span className="text-6xl font-semibold leading-none text-white">
            {weather.current.temperatureCelsius}°
          </span>
          <span className="pb-2 text-sm text-slate-400">
            {text.feelsLike} {weather.current.feelsLikeCelsius}°C
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Thermometer className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            <p className="mt-3 text-xs font-medium uppercase text-slate-500">
              {text.temperature}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {weather.current.temperatureCelsius}°C
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Droplets className="h-5 w-5 text-sky-300" aria-hidden="true" />
            <p className="mt-3 text-xs font-medium uppercase text-slate-500">{text.humidity}</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {weather.current.humidityPercent}%
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Wind className="h-5 w-5 text-amber-300" aria-hidden="true" />
            <p className="mt-3 text-xs font-medium uppercase text-slate-500">{text.wind}</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {weather.current.windSpeedKmh} km/h
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">{text.forecastTitle}</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {weather.forecast.map((day) => {
              const ForecastIcon = getWeatherIcon(day.condition);

              return (
                <div key={day.date} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">
                      {formatForecastDate(day.date, language)}
                    </p>
                    <ForecastIcon className="h-5 w-5 text-slate-300" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {translateCondition(day.condition, day.conditionLabel, language)}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {day.minTemperatureCelsius}° / {day.maxTemperatureCelsius}°C
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {text.rain} {day.precipitationChancePercent}% | {text.humidity}{" "}
                    {day.humidityPercent}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-emerald-100">
              {text.advisoryTitle}
            </h3>
          </div>
          <div className="mt-3 space-y-2">
            {localizedInsights.map((insight) => (
              <p key={insight} className="text-sm leading-6 text-emerald-50">
                {insight}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-5">
          <h3 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-amber-300" aria-hidden="true" />
            {text.takeawayTitle}
          </h3>
          <ul className="mt-4 space-y-3" role="list">
            {farmerSummary.map((item, i) => (
              <li
                key={i}
                className="text-base font-semibold text-amber-50 leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
