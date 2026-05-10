import type { Asteroid, BrowseResponse, FeedResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getFeed(
  startDate: string,
  endDate: string
): Promise<FeedResponse> {
  return apiFetch<FeedResponse>(
    `/feed/?sdate=${startDate}&edate=${endDate}`
  );
}

export async function getLookup(asteroidId: string): Promise<Asteroid> {
  return apiFetch<Asteroid>(`/lookup/${asteroidId}`);
}

export async function getBrowse(page: Number): Promise<BrowseResponse> {
  return apiFetch<BrowseResponse>(`/browse/?page=${page}`);
}
