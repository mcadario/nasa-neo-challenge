"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortKey = "diameter" | "distance" | "velocity" | "magnitude";
export type SortDir = "asc" | "desc";

export interface SortState {
  key: SortKey | null;
  dir: SortDir;
}

export const DEFAULT_SORT: SortState = { key: null, dir: "asc" };

const LABELS: Record<SortKey, string> = {
  diameter: "Diameter",
  distance: "Distance",
  velocity: "Velocity",
  magnitude: "Magnitude",
};

interface NeoSortPanelProps {
  sort: SortState;
  onChange: (sort: SortState) => void;
}

export function NeoSortPanel({ sort, onChange }: NeoSortPanelProps) {
  function handleClick(key: SortKey) {
    if (sort.key === key) {
      // stesso tasto: inverti direzione
      onChange({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      // nuovo tasto: parti da asc
      onChange({ key, dir: "asc" });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">Sort by:</span>
      {(Object.keys(LABELS) as SortKey[]).map((key) => {
        const active = sort.key === key;
        return (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors border ${
              active
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {LABELS[key]}
            {active ? (
              sort.dir === "asc" ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )
            ) : (
              <ChevronsUpDown className="h-3 w-3 opacity-40" />
            )}
          </button>
        );
      })}
    </div>
  );
}