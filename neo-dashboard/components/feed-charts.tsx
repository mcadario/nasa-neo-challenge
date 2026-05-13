"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, ScatterChart,
  Scatter, ZAxis, Legend,
} from "recharts";
import type { Asteroid } from "@/lib/types";

const CHART_STYLE = {
  cartesianGrid: { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" },
  tooltip: {
    contentStyle: {
      background: "hsl(224,71%,6%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: "#9ca3af" },
  },
};

interface FeedChartsProps {
  nearEarthObjects: Record<string, Asteroid[]>;
}

export function FeedCharts({ nearEarthObjects }: FeedChartsProps) {
  const allAsteroids = Object.values(nearEarthObjects).flat();

  // 1. bar chart: objects per day
  const perDay = Object.entries(nearEarthObjects)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, asteroids]) => ({
      date: date.slice(5), // MM-DD
      total: asteroids.length,
      hazardous: asteroids.filter((a) => a.is_potentially_hazardous_asteroid).length,
    }));

  // 2. pie: safe vs hazardous
  const hazardousCount = allAsteroids.filter((a) => a.is_potentially_hazardous_asteroid).length;
  const pieData = [
    { name: "Safe", value: allAsteroids.length - hazardousCount, color: "#4ade80" },
    { name: "Hazardous", value: hazardousCount, color: "#f87171" },
  ];

  // 3. scatter: diameter vs distance
  const scatterData = allAsteroids
    .filter((a) => a.close_approach_data?.[0])
    .map((a) => ({
      diameter: Math.round(
        (a.estimated_diameter.meters.estimated_diameter_min +
          a.estimated_diameter.meters.estimated_diameter_max) / 2
      ),
      distance: parseFloat(parseFloat(a.close_approach_data[0].miss_distance.lunar).toFixed(1)),
      hazardous: a.is_potentially_hazardous_asteroid,
      name: a.name.replace(/[()]/g, ""),
    }));

  const safeScatter = scatterData.filter((d) => !d.hazardous);
  const hazardousScatter = scatterData.filter((d) => d.hazardous);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Analytics
      </h3>

      <div className="grid gap-4 md:grid-cols-3">

        {/* objects per day */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Objects per day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={perDay} barGap={2}>
                <CartesianGrid {...CHART_STYLE.cartesianGrid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} width={25} />
                <Tooltip {...CHART_STYLE.tooltip} />
                <Bar dataKey="total" name="Total" fill="#63d2ff" opacity={0.5} radius={[3, 3, 0, 0]} />
                <Bar dataKey="hazardous" name="Hazardous" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* pie: safe vs hazardous */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Risk classification
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip {...CHART_STYLE.tooltip} formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-mono font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* scatter: diameter vs miss distance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Diameter vs Miss Distance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid {...CHART_STYLE.cartesianGrid} />
              <XAxis
                dataKey="diameter"
                name="Diameter (m)"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                label={{ value: "Diameter (m)", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 10 }}
              />
              <YAxis
                dataKey="distance"
                name="Miss dist. (LD)"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={35}
                label={{ value: "LD", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 10 }}
              />
              <ZAxis range={[40, 40]} />
              <Tooltip
                {...CHART_STYLE.tooltip}
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={CHART_STYLE.tooltip.contentStyle}>
                      <p style={{ color: "#e8eaf0", marginBottom: 4 }}>{d.name}</p>
                      <p style={CHART_STYLE.tooltip.labelStyle}>Diameter: {d.diameter} m</p>
                      <p style={CHART_STYLE.tooltip.labelStyle}>Distance: {d.distance} LD</p>
                    </div>
                  );
                }}
              />
              <Scatter name="Safe" data={safeScatter} fill="#63d2ff" opacity={0.7} />
              <Scatter name="Hazardous" data={hazardousScatter} fill="#f87171" opacity={0.85} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: "#9ca3af" }}>{value}</span>}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}