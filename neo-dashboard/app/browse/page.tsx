"use client";

import { useState } from "react";
import { List, AlertCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getBrowse } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { BrowseResponse } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FilterBtn } from "@/components/filter-btn";

export default function BrowsePage() {
  const router = useRouter();
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hazardous">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 20

  async function handleBrowse() {
    setLoading(true);
    setError(null);
    try {
      const res = await getBrowse();
      setData(res);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const allAsteroids = data?.near_earth_objects ?? [];
  const filtered =
    filter === "hazardous"
      ? allAsteroids.filter((a) => a.is_potentially_hazardous_asteroid)
      : allAsteroids;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
        <p className="text-muted-foreground mt-1">
          Browse all Near Earth Objects in the NASA database.
        </p>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleBrowse} disabled={loading} className="gap-2">
          <List className="h-4 w-4" />
          {loading ? "Loading…" : data ? "Refresh" : "Load all NEOs"}
        </Button>

        {data && (
          <div className="flex items-center gap-1 rounded-md border border-border p-1">
            <FilterBtn active={filter === "all"} onClick={() => { setFilter("all"); setCurrentPage(1); }}>
              All ({allAsteroids.length})
            </FilterBtn>
            <FilterBtn active={filter === "hazardous"} onClick={() => { setFilter("hazardous"); setCurrentPage(1); }}>
              Hazardous ({allAsteroids.filter(a => a.is_potentially_hazardous_asteroid).length})
            </FilterBtn>
          </div>
        )}

        {data && (
          <p className="ml-auto text-xs text-muted-foreground font-mono">
            {data.page.total_elements.toLocaleString()} total in NASA db
          </p>
        )}
      </div>
      
      {/* error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Request failed</AlertTitle>
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      )}

      {/* table */}
      {!loading && paged.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Diameter (m)</TableHead>
                  <TableHead className="text-right">Magnitude</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Approaches</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((asteroid) => (
                  <TableRow
                    key={asteroid.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/lookup?id=${asteroid.id}`)}
                  >
                    <TableCell className="font-mono text-xs">
                      {asteroid.name.replace(/[()]/g, "")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_min, 0)}
                      {" – "}
                      {formatNumber(asteroid.estimated_diameter.meters.estimated_diameter_max, 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {asteroid.absolute_magnitude_h.toFixed(1)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {asteroid.is_potentially_hazardous_asteroid ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="h-3 w-3" /> Hazardous
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">Safe</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right font-mono text-xs text-muted-foreground">
                      {asteroid.close_approach_data.length}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* pagination */}
          {(
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages} — showing {paged.length} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* empty */}
      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <List className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Press "Load all NEOs" to browse the database.</p>
        </div>
      )}
    </div>
  );
}