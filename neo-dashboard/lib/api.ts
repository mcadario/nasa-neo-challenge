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

//per streaming
export async function getFeedStream(
  startDate: string,
  endDate: string,
  onProgress: (progress: {
    current: number;
    total: number;
    key: string;
    source: "cache" | "nasa";
    chunk_start: string;
    chunk_end: string;
  }) => void,
  signal?: AbortSignal
): Promise<FeedResponse> {
  const res = await fetch(
    `${BASE}/feed/stream/?sdate=${startDate}&edate=${endDate}`,
    {
      cache: "no-store",
      signal,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  if (!res.body) {
    throw new Error("ReadableStream not supported");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let finalData: FeedResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      const message = JSON.parse(line);

      if (message.type === "progress") {
        onProgress(message);
      }

      if (message.type === "done") {
        finalData = message.data;
      }
    }
  }

  if (!finalData) {
    throw new Error("Stream ended without final data");
  }

  return finalData;
}