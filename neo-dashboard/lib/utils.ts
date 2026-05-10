import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Asteroid } from "./types";
import type { SortState } from "@/components/neo-sort";


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

export function sortAsteroids(asteroids: Asteroid[], sort: SortState): Asteroid[] {
  if (!sort.key) return asteroids;
 
  const getValue = (a: Asteroid): number => {
    switch (sort.key) {
      case "diameter":
        return (
          a.estimated_diameter.meters.estimated_diameter_min +
          a.estimated_diameter.meters.estimated_diameter_max
        ) / 2;
      case "distance":
        return a.close_approach_data?.[0]
          ? parseFloat(a.close_approach_data[0].miss_distance.lunar)
          : Infinity;
      case "velocity":
        return a.close_approach_data?.[0]
          ? parseFloat(a.close_approach_data[0].relative_velocity.kilometers_per_second)
          : 0;
      case "magnitude":
        return a.absolute_magnitude_h;
      default:
        return 0;
    }
  };
 
  return [...asteroids].sort((a, b) => {
    const diff = getValue(a) - getValue(b);
    return sort.dir === "asc" ? diff : -diff;
  });
}



