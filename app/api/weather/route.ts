import { NextResponse } from "next/server";
import type {
  CurrentWeatherMetrics,
  ForecastSummary,
  SmartAgriculturalInsights,
  WeatherApiResponse,
  WeatherCondition,
} from "../../../types/weather";

const DEFAULT_LATITUDE = -1.2921;
const DEFAULT_LONGITUDE = 36.8219;

interface OpenMeteoCurrentResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
}

interface OpenMeteoDailyResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
}

function parseCoordinate(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** WMO → WeatherCondition mapping */
function mapCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code === 1 || code === 2 || code === 3) return "clouds";
  if (code >= 45 && code <= 48) return "mist";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "thunderstorm";
  return "unknown";
}

/** Human-readable label for a WMO code */
function mapConditionLabel(code: number): string {
  const labels: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Light snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };
  return labels[code] ?? "Unknown";
}

/** Reusable condition look-up from WMO code */
function weatherConditionFromCode(code: number): { condition: WeatherCondition; label: string } {
  return { condition: mapCondition(code), label: mapConditionLabel(code) };
}

/** Build agricultural insight strings from live metrics */
function buildInsights(
  conditionCode: number,
  humidityPercent: number,
  windSpeedKmh: number,
  temperatureCelsius: number,
): SmartAgriculturalInsights {
  const insights: SmartAgriculturalInsights = [];
  const { condition } = weatherConditionFromCode(conditionCode);
  const isRain = condition === "rain" || condition === "drizzle" || condition === "thunderstorm";

  if (isRain || humidityPercent > 80) {
    insights.push(
      "⚠️ Rain or extreme humidity detected. Delay all chemical sprays immediately — treatment will wash away and fail.",
    );
  }

  if (windSpeedKmh > 15) {
    insights.push(
      "⚠️ High wind speeds right now. Avoid spraying pesticides or fungicides to prevent drift onto neighbouring plots.",
    );
  }

  if (humidityPercent > 80 && temperatureCelsius >= 10 && temperatureCelsius <= 20) {
    insights.push(
      "⚠️ Late Blight breeding conditions confirmed. Inspect tomato leaves first thing tomorrow morning for water-soaked lesions.",
    );
  }

  if (condition === "clear" && windSpeedKmh <= 15) {
    insights.push(
      "🌱 Clear, calm conditions — ideal window for field scouting, safe pesticide application, and controlled irrigation.",
    );
  }

  return insights.length > 0
    ? insights
    : ["Weather conditions are stable. Continue routine crop scouting and soil moisture checks."];
}

/** Map Open-Meteo current response → CurrentWeatherMetrics */
function mapCurrentWeather(
  data: OpenMeteoCurrentResponse,
  locationLabel: string,
): CurrentWeatherMetrics {
  const current = data.current ?? {};
  const temp = current.temperature_2m ?? 0;
  const feelsLike = current.apparent_temperature ?? temp;
  const humidity = current.relative_humidity_2m ?? 0;
  const wind = current.wind_speed_10m ?? 0;
  const code = current.weather_code ?? 0;
  const { condition, label } = weatherConditionFromCode(code);

  return {
    location: locationLabel,
    country: "KE",
    observedAt: current.time ?? new Date().toISOString(),
    temperatureCelsius: Math.round(temp),
    feelsLikeCelsius: Math.round(feelsLike),
    humidityPercent: Math.round(humidity),
    windSpeedKmh: Math.round(wind),
    condition,
    conditionLabel: label,
    iconCode: String(code),
  };
}

/** Map Open-Meteo daily forecast → ForecastSummary[] */
function mapDailyForecast(
  daily: NonNullable<OpenMeteoDailyResponse["daily"]>,
): ForecastSummary[] {
  const count = Math.min(
    (daily.time ?? []).length,
    (daily.temperature_2m_max ?? []).length,
    (daily.temperature_2m_min ?? []).length,
    (daily.precipitation_probability_max ?? []).length,
    (daily.weather_code ?? []).length,
  );

  const entries: ForecastSummary[] = [];

  for (let i = 0; i < Math.min(count, 3); i++) {
    const date = daily.time![i];
    const code = daily.weather_code![i];
    const { condition, label } = weatherConditionFromCode(code);

    entries.push({
      date,
      minTemperatureCelsius: Math.round(daily.temperature_2m_min![i]),
      maxTemperatureCelsius: Math.round(daily.temperature_2m_max![i]),
      humidityPercent: 0,          // daily endpoint does not expose humidity
      windSpeedKmh: 0,             // daily endpoint does not expose wind (0 = unknown)
      precipitationChancePercent: daily.precipitation_probability_max![i],
      condition,
      conditionLabel: label,
    });
  }

  return entries;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseCoordinate(searchParams.get("lat"), DEFAULT_LATITUDE);
  const longitude = parseCoordinate(searchParams.get("lon"), DEFAULT_LONGITUDE);
  const cityHint = searchParams.get("city") ?? null;
  // Use a readable location label; reverse geocoding (Nominatim) is omitted
  // to avoid CORS 403 on the server-side fetch.
  const locationLabel = cityHint ?? "Farm Region";

  try {
    const [currentRes, dailyRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Africa%2FNairobi`,
        { signal: AbortSignal.timeout(10_000) },
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=Africa%2FNairobi&forecast_days=3`,
        { signal: AbortSignal.timeout(10_000) },
      ),
    ]);

    if (!currentRes.ok || !dailyRes.ok) {
      console.error("[weather] Upstream response not OK:", {
        current: currentRes.status,
        daily: dailyRes.status,
        lat: latitude,
        lon: longitude,
      });
      return NextResponse.json(
        { error: "Weather data is temporarily unavailable." },
        { status: 502 },
      );
    }

    const currentJson = (await currentRes.json()) as OpenMeteoCurrentResponse;
    const dailyJson = (await dailyRes.json()) as OpenMeteoDailyResponse;

    const current = mapCurrentWeather(currentJson, locationLabel);
    const forecast = mapDailyForecast(dailyJson.daily ?? {});
    const conditionCode = currentJson.current?.weather_code ?? 0;
    const insights = buildInsights(
      conditionCode,
      current.humidityPercent,
      current.windSpeedKmh,
      current.temperatureCelsius,
    );

    const payload: WeatherApiResponse = {
      current,
      forecast,
      insights,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=900, s-maxage=900",
      },
    });
  } catch (error) {
    console.error("[weather] Unexpected error:", {
      message: error instanceof Error ? error.message : String(error),
      lat: latitude,
      lon: longitude,
    });
    return NextResponse.json(
      { error: "Weather service is temporarily unavailable." },
      { status: 500 },
    );
  }
}
