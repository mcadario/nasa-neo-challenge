import { ExternalLink, Gauge, Ruler, Target, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Asteroid } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface AsteroidCardProps {
  asteroid: Asteroid;
}

export function AsteroidCard({ asteroid }: AsteroidCardProps) {
  const approach = asteroid.close_approach_data?.[0];
  const diamMin = asteroid.estimated_diameter.meters.estimated_diameter_min;
  const diamMax = asteroid.estimated_diameter.meters.estimated_diameter_max;
  const isHazardous = asteroid.is_potentially_hazardous_asteroid;

  const router = useRouter();

  return (
    <Card
      onClick={() => router.push(`/lookup?id=${asteroid.id}`)}
      className={`animate-fade-in transition-colors hover:border-primary/40 ${
        isHazardous ? "border-destructive/30" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-mono">
              {asteroid.name.replace(/[()]/g, "")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">ID: {asteroid.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isHazardous ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Hazardous
              </Badge>
            ) : (
              <Badge variant="success">Safe</Badge>
            )}
            {asteroid.is_sentry_object && (
              <Badge variant="warning">Sentry</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Diameter"
            value={`${formatNumber(diamMin, 0)}–${formatNumber(diamMax, 0)} m`}
          />
          <Stat
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Magnitude"
            value={`H ${asteroid.absolute_magnitude_h.toFixed(1)}`}
          />
          {approach && (
            <>
              <Stat
                icon={<Target className="h-3.5 w-3.5" />}
                label="Miss distance"
                value={`${formatNumber(parseFloat(approach.miss_distance.lunar), 1)} LD`}
              />
              <Stat
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="Velocity"
                value={`${formatNumber(parseFloat(approach.relative_velocity.kilometers_per_second), 1)} km/s`}
              />
            </>
          )}
        </div>

        {approach && (
          <p className="text-xs text-muted-foreground font-mono border-t border-border pt-2">
            Close approach: {approach.close_approach_date_full ?? approach.close_approach_date}
            {" · "}{approach.orbiting_body}
          </p>
        )}

        <a
          href={asteroid.nasa_jpl_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          NASA JPL <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-mono font-medium">{value}</p>
    </div>
  );
}
