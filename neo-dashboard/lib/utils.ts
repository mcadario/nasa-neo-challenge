import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Asteroid } from "./types";
import type { NeoFilters } from "@/components/filters-panel";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function kmToAU(km: string): string {
  return (parseFloat(km) / 149597870.7).toFixed(4);
}

export function applyNeoFilters(asteroids: Asteroid[], filters: NeoFilters): Asteroid[] {
  return asteroids.filter((a) => {
    const diamAvg = (
      a.estimated_diameter.meters.estimated_diameter_min +
      a.estimated_diameter.meters.estimated_diameter_max
    ) / 2;
 
    const missDistance = a.close_approach_data?.[0]
      ? parseFloat(a.close_approach_data[0].miss_distance.lunar)
      : null;
 
    if (filters.minDiameter && diamAvg < parseFloat(filters.minDiameter)) return false;
    if (filters.maxDiameter && diamAvg > parseFloat(filters.maxDiameter)) return false;
    if (filters.maxDistance && missDistance !== null && missDistance > parseFloat(filters.maxDistance)) return false;
 
    return true;
  });
}

