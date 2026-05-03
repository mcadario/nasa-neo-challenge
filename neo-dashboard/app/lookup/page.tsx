"use client";

import { useState } from "react";
import { Search, AlertCircle, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLookup } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { Asteroid } from "@/lib/types";

const EXAMPLE_IDS = ["3542519", "2465633", "54016034", "3758838"];

export default function LookupPage() {
  const [asteroidId, setAsteroidId] = useState("");
  const [data, setData] = useState<Asteroid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(id?: string) {
    const target = id ?? asteroidId;
    if (!target) return;
    if (id) setAsteroidId(id);
    setLoading(true);
    setError(null);
    try {
      const res = await getLookup(target);
      setData(res);
    } catch (e: any) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asteroid Lookup</h1>
        <p className="text-muted-foreground mt-1">
          Fetch full details for a single asteroid by its SPK ID.
        </p>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            SPK Asteroid ID
          </label>
          <Input
            type="text"
            placeholder="e.g. 3542519"
            value={asteroidId}
            onChange={(e) => setAsteroidId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            className="w-52 font-mono"
          />
        </div>
        <Button onClick={() => handleLookup()} disabled={loading || !asteroidId} className="gap-2">
          <Search className="h-4 w-4" />
          {loading ? "Fetching…" : "Lookup"}
        </Button>
      </div>

      {/* example chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Try:</span>
        {EXAMPLE_IDS.map((id) => (
          <button
            key={id}
            onClick={() => handleLookup(id)}
            className="rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            {id}
          </button>
        ))}
      </div>

      {/* error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not found</AlertTitle>
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* loading */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {/* result */}
      {!loading && data && <AsteroidDetail asteroid={data} />}

      {/* empty */}
      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Info className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Enter an asteroid ID to see details.</p>
        </div>
      )}
    </div>
  );
}

function AsteroidDetail({ asteroid }: { asteroid: Asteroid }) {
  const isHazardous = asteroid.is_potentially_hazardous_asteroid;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-mono font-semibold">
          {asteroid.name.replace(/[()]/g, "")}
        </h2>
        {isHazardous ? (
          <Badge variant="destructive">Potentially Hazardous</Badge>
        ) : (
          <Badge variant="success">Non-Hazardous</Badge>
        )}
        {asteroid.is_sentry_object && <Badge variant="warning">Sentry Object</Badge>}
        <a
          href={asteroid.nasa_jpl_url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          NASA JPL <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* physical properties */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Physical properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="ID" value={asteroid.id} mono />
            <Row label="Magnitude (H)" value={asteroid.absolute_magnitude_h.toFixed(2)} mono />
            <Row
              label="Diameter (km)"
              value={`${asteroid.estimated_diameter.kilometers.estimated_diameter_min.toFixed(3)} – ${asteroid.estimated_diameter.kilometers.estimated_diameter_max.toFixed(3)}`}
              mono
            />
            <Row
              label="Diameter (m)"
              value={`${formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_min, 0)} – ${formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_max, 0)}`}
              mono
            />
          </CardContent>
        </Card>

        {/* orbital data */}
        {asteroid.orbital_data && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                Orbital data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label="Eccentricity" value={parseFloat(asteroid.orbital_data.eccentricity).toFixed(6)} mono />
              <Row label="Semi-major axis" value={`${parseFloat(asteroid.orbital_data.semi_major_axis).toFixed(4)} AU`} mono />
              <Row label="Inclination" value={`${parseFloat(asteroid.orbital_data.inclination).toFixed(4)}°`} mono />
              <Row label="Orbital period" value={`${parseFloat(asteroid.orbital_data.orbital_period).toFixed(2)} days`} mono />
              <Row label="Observations" value={asteroid.orbital_data.observations_used.toString()} mono />
              <Row label="Data arc" value={`${asteroid.orbital_data.data_arc_in_days} days`} mono />
            </CardContent>
          </Card>
        )}
      </div>

      {/* close approaches */}
      {asteroid.close_approach_data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Close approaches ({asteroid.close_approach_data.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left pb-2 pr-4 font-medium">Date</th>
                    <th className="text-right pb-2 pr-4 font-medium">Velocity (km/s)</th>
                    <th className="text-right pb-2 pr-4 font-medium">Miss dist. (LD)</th>
                    <th className="text-right pb-2 font-medium">Body</th>
                  </tr>
                </thead>
                <tbody>
                  {asteroid.close_approach_data.slice(0, 10).map((ca, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 pr-4 text-foreground">{ca.close_approach_date}</td>
                      <td className="py-1.5 pr-4 text-right">
                        {parseFloat(ca.relative_velocity.kilometers_per_second).toFixed(2)}
                      </td>
                      <td className="py-1.5 pr-4 text-right">
                        {parseFloat(ca.miss_distance.lunar).toFixed(1)}
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">{ca.orbiting_body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {asteroid.close_approach_data.length > 10 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing 10 of {asteroid.close_approach_data.length} approaches.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-1 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
