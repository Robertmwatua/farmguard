export type WeatherCondition =
  | "clear"
  | "clouds"
  | "rain"
  | "drizzle"
  | "thunderstorm"
  | "snow"
  | "mist"
  | "unknown";

export interface CurrentWeatherMetrics {
  location: string;
  country: string;
  observedAt: string;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidityPercent: number;
  windSpeedKmh: number;
  condition: WeatherCondition;
  conditionLabel: string;
  iconCode: string;
}

export interface ForecastSummary {
  date: string;
  minTemperatureCelsius: number;
  maxTemperatureCelsius: number;
  humidityPercent: number;
  windSpeedKmh: number;
  precipitationChancePercent: number;
  condition: WeatherCondition;
  conditionLabel: string;
}

export type SmartAgriculturalInsights = string[];

export interface WeatherApiResponse {
  current: CurrentWeatherMetrics;
  forecast: ForecastSummary[];
  insights: SmartAgriculturalInsights;
}
