import { z } from 'zod';

export const weatherDataSchema = z.object({
  tripId: z.number(),
  locationId: z.number().optional().nullable(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  temperatureHigh: z.number().optional().nullable(),
  temperatureLow: z.number().optional().nullable(),
  conditions: z.string().max(255).optional().nullable(),
  precipitation: z.number().optional().nullable(),
  humidity: z.number().int().min(0).max(100).optional().nullable(),
  windSpeed: z.number().optional().nullable(),
  sunrise: z.string().datetime().optional().nullable(), // ISO datetime string for sunrise
  sunset: z.string().datetime().optional().nullable(), // ISO datetime string for sunset
});

export const refreshWeatherSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type WeatherDataInput = z.infer<typeof weatherDataSchema>;
export type RefreshWeatherInput = z.infer<typeof refreshWeatherSchema>;
