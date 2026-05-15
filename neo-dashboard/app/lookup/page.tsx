"use client";

import Image from "next/image";
import { Suspense, useState, useEffect, useRef } from "react";
import { Search, AlertCircle, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLookup } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { Asteroid, CloseApproach } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { FilterBtn } from "@/components/filter-btn";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine,
} from "recharts";

const EXAMPLE_IDS = ["3542519", "2465633", "54016034", "3758838"];

function Countdown({ target }: { target: number }) {
  const [remaining, setRemaining] = useState(target - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const isPast = remaining <= 0;
  const abs = Math.abs(remaining);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const secs = Math.floor((abs % 60000) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {isPast ? "T+ elapsed" : "T− countdown"}
      </p>
      <div className="flex items-end gap-1">
        {[{ label: "DAYS", val: days }, { label: "HRS", val: hours }, { label: "MIN", val: mins }, { label: "SEC", val: secs }].map(({ label, val }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="bg-background border border-border rounded px-2 py-1 min-w-[48px] text-center">
              <span className="text-2xl font-mono font-bold text-foreground">{pad(val)}</span>
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5 tracking-widest">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHART_STYLE = {
  cartesianGrid: { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" },
  tooltip: {
    contentStyle: { background: "hsl(224,71%,6%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 },
    labelStyle: { color: "#9ca3af" },
  },
};

function DistanceChart({ approaches }: { approaches: CloseApproach[] }) {
  const data = approaches
    .slice()
    .sort((a, b) => a.epoch_date_close_approach - b.epoch_date_close_approach)
    .map((ca) => ({
      date: ca.close_approach_date,
      distance: parseFloat(parseFloat(ca.miss_distance.lunar).toFixed(1)),
      velocity: parseFloat(parseFloat(ca.relative_velocity.kilometers_per_second).toFixed(2)),
    }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Miss Distance over time (LD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#63d2ff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#63d2ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_STYLE.cartesianGrid} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} axisLine={false} width={35} />
              <Tooltip
                  {...CHART_STYLE.tooltip}
                  formatter={(value) => {
                    const n = Number(value ?? 0);
                    return [`${n.toFixed(1)} LD`, "Distance"];
                  }}
                />
              <ReferenceLine y={1} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" label={{ value: "Moon orbit", fill: "#ef4444", fontSize: 9 }} />
              <Area type="monotone" dataKey="distance" stroke="#63d2ff" strokeWidth={2} fill="url(#distGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Relative Velocity over time (km/s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_STYLE.cartesianGrid} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} axisLine={false} width={35} />
              <Tooltip
                  {...CHART_STYLE.tooltip}
                  formatter={(value) => {
                    const n = Number(value ?? 0);
                    return [`${n.toFixed(2)} km/s`, "Velocity"];
                  }}
                />
              <Area type="monotone" dataKey="velocity" stroke="#f59e0b" strokeWidth={2} fill="url(#velGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}


function ApproachTable({ approaches, total }: { approaches: CloseApproach[]; total?: number }) {
  return (
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
          {approaches.map((ca, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-1.5 pr-4 text-foreground">{ca.close_approach_date}</td>
              <td className="py-1.5 pr-4 text-right">{parseFloat(ca.relative_velocity.kilometers_per_second).toFixed(2)}</td>
              <td className="py-1.5 pr-4 text-right">{parseFloat(ca.miss_distance.lunar).toFixed(1)}</td>
              <td className="py-1.5 text-right text-muted-foreground">{ca.orbiting_body}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total && total > approaches.length && (
        <p className="mt-2 text-xs text-muted-foreground">Showing {approaches.length} of {total}.</p>
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


function AsteroidDetail({ asteroid }: { asteroid: Asteroid }) {
  const isHazardous = asteroid.is_potentially_hazardous_asteroid;
  const [approachView, setApproachView] = useState<"future" | "past">("future");

  const now = Date.now();
  const sorted = asteroid.close_approach_data
    .slice()
    .sort((a, b) => b.epoch_date_close_approach - a.epoch_date_close_approach);
  const future = sorted.filter((ca) => ca.epoch_date_close_approach > now);
  const past = sorted.filter((ca) => ca.epoch_date_close_approach <= now);
  const nextApproach = future[future.length - 1];

  const avgDiameter = (
    asteroid.estimated_diameter.meters.estimated_diameter_min +
    asteroid.estimated_diameter.meters.estimated_diameter_max
  ) / 2;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── HERO ── */}
      <Card className={`border ${isHazardous ? "border-destructive/30" : "border-border"}`}>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

            {/* left: name + props */}
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {isHazardous
                    ? <Badge variant="destructive">Potentially Hazardous</Badge>
                    : <Badge variant="success">Non-Hazardous</Badge>}
                  {asteroid.is_sentry_object && <Badge variant="warning">Sentry</Badge>}
                </div>
                <h2 className="text-2xl font-mono font-bold">
                  {asteroid.name.replace(/[()]/g, "")}
                </h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {asteroid.id}</p>
              </div>

              <div className="space-y-1.5">
                <StatLine label="Diameter" value={`${formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_min, 0)} – ${formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_max, 0)} m`} />
                <StatLine label="Magnitude" value={`H ${asteroid.absolute_magnitude_h.toFixed(1)}`} />
                {nextApproach && (
                  <>
                    <StatLine label="Next approach" value={nextApproach.close_approach_date} />
                    <StatLine label="Miss distance" value={`${parseFloat(nextApproach.miss_distance.lunar).toFixed(1)} LD`} />
                    <StatLine label="Velocity" value={`${parseFloat(nextApproach.relative_velocity.kilometers_per_second).toFixed(1)} km/s`} />
                  </>
                )}
              </div>

              <a
                href={asteroid.nasa_jpl_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                NASA JPL <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* center: asteroid illustration */}
            <div className="flex justify-center">
              <div className="w-44 h-44">
                <div className="w-44 h-44 flex flex-col items-center justify-center">
                  <Image
                    src="/asteroid.png"
                    alt="asteroid"
                    width={160}
                    height={160}
                    className={`drop-shadow-lg ${isHazardous ? "hue-rotate-[320deg] saturate-150" : ""}`}
                  />
                  <p className="text-xs font-mono text-primary mt-1">
                    {avgDiameter >= 1000
                      ? `${(avgDiameter / 1000).toFixed(1)} km`
                      : `${Math.round(avgDiameter)} m`}
                  </p>
                  <p className="text-[9px] text-muted-foreground">avg diameter</p>
                </div>
              </div>
            </div>

            {/* right: countdown */}
            <div className="flex flex-col items-center justify-center gap-3">
              {nextApproach ? (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                    Next close approach
                  </p>
                  <Countdown target={nextApproach.epoch_date_close_approach} />
                  <p className="text-xs font-mono text-muted-foreground">
                    {nextApproach.close_approach_date_full ?? nextApproach.close_approach_date}
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-2">
                    No future approaches
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {past.length > 0 && `Last: ${past[0].close_approach_date}`}
                  </p>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── CHARTS ── */}
      {asteroid.close_approach_data.length > 1 && (
        <DistanceChart approaches={asteroid.close_approach_data} />
      )}

      {/* ── PHYSICAL + ORBITAL ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Physical properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Magnitude (H)" value={asteroid.absolute_magnitude_h.toFixed(2)} mono />
            <Row label="Diameter (km)" value={`${asteroid.estimated_diameter.kilometers.estimated_diameter_min.toFixed(3)} – ${asteroid.estimated_diameter.kilometers.estimated_diameter_max.toFixed(3)}`} mono />
            <Row label="Diameter (m)" value={`${formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_min, 0)} – ${formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_max, 0)}`} mono />
          </CardContent>
        </Card>

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

      {/* ── CLOSE APPROACHES TABLE ── */}
      {asteroid.close_approach_data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                Close approaches ({asteroid.close_approach_data.length})
              </CardTitle>
              <div className="flex items-center gap-1 rounded-md border border-border p-1">
                <FilterBtn active={approachView === "future"} onClick={() => setApproachView("future")}>
                  Future ({future.length})
                </FilterBtn>
                <FilterBtn active={approachView === "past"} onClick={() => setApproachView("past")}>
                  Past ({past.length})
                </FilterBtn>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ApproachTable
              approaches={approachView === "future" ? future : past}
              total={approachView === "past" ? past.length : undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-mono text-right">{value}</span>
    </div>
  );
}


function LookupPageContent() {
  const [asteroidId, setAsteroidId] = useState("");
  const [data, setData] = useState<Asteroid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) handleLookup(id); /* id è nei parametri di ricerca solo se si accede alla pagina
                                  "lookup" cliccando su un asteroide su browse */
  }, []);

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
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
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

export default function LookupPage() {
  return (
    <Suspense fallback={<LookupFallback />}>
      <LookupPageContent />
    </Suspense>
  );
}

function LookupFallback() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asteroid Lookup</h1>
        <p className="text-muted-foreground mt-1">
          Loading lookup page…
        </p>
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}