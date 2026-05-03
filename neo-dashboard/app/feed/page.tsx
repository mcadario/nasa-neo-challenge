"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { Search, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AsteroidCard } from "@/components/asteroid-card";
import { getFeed } from "@/lib/api";
import type { Asteroid, FeedResponse } from "@/lib/types";
import { FilterBtn } from "@/components/filter-btn";


function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-52 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function FeedPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hazardous" | "safe">("all");

  async function handleFetch() {
    setError(null);
    if (endDate < startDate) {
      setError("Controllare correttezza ordine tra prima e seconda data.");
      return;
    }

    setLoading(true);
    try {
      const res = await getFeed(startDate, endDate);
      setData(res);
      setSource((res as any).source ?? null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const dateEntries = data
    ? Object.entries(data.near_earth_objects)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, asteroids]): [string, Asteroid[]] => [
          date,
          asteroids.filter((a) => {
            if (filter === "hazardous") return a.is_potentially_hazardous_asteroid;
            if (filter === "safe") return !a.is_potentially_hazardous_asteroid;
            return true;
          }),
        ])
        .filter(([, asteroids]) => asteroids.length > 0)
    : [];

  const totalHazardous = data
    ? Object.values(data.near_earth_objects)
        .flat()
        .filter((a) => a.is_potentially_hazardous_asteroid).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">NEO Feed</h1>
        <p className="text-muted-foreground mt-1">
          Inserisci range di ricerca.
        </p>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-44 font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-44 font-mono"
          />
        </div>
        <Button onClick={handleFetch} disabled={loading} className="gap-2">
          <Search className="h-4 w-4" />
          {loading ? "Fetching…" : "Search"}
        </Button>
      </div>

      {/*filters */}
      {data && ( // solo se la data è disponibile
        <div className="flex items-center gap-1 rounded-md border border-border p-1 w-fit">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
            All ({data.element_count})
          </FilterBtn>
          <FilterBtn active={filter === "hazardous"} onClick={() => setFilter("hazardous")}>
            Hazardous ({totalHazardous})
          </FilterBtn>
          <FilterBtn active={filter === "safe"} onClick={() => setFilter("safe")}>
            Safe ({data.element_count - totalHazardous})
          </FilterBtn>
        </div>
      )}

      {/* error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Request failed</AlertTitle>
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* loading */}
      {loading && <SkeletonGrid />}

      {/* results */}
      {!loading && data && (
        <div className="space-y-8">
          {/* summary bar */}
          <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-card p-4">
            <Metric label="Total objects" value={data.element_count} />
            <Metric label="Days" value={dateEntries.length} />
            <Metric label="Potentially hazardous" value={totalHazardous} danger={totalHazardous > 0} />
            {source && (
              <Metric
                label="Source"
                value={source.toUpperCase()}
                mono
                dimmed={source === "cache"}
              />
            )}
          </div>

          {/* grouped by date */}
          {dateEntries.map(([date, asteroids]) => (
            <section key={date} className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold font-mono">{date}</h2>
                <span className="text-xs text-muted-foreground">
                  {asteroids.length} object{asteroids.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {asteroids.map((asteroid) => (
                  <AsteroidCard key={asteroid.id} asteroid={asteroid} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* empty state */}
      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Select a date range and press Search.
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  danger,
  mono,
  dimmed,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
  mono?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span
        className={`text-lg font-semibold ${mono ? "font-mono text-sm" : ""} ${
          danger ? "text-destructive" : dimmed ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
