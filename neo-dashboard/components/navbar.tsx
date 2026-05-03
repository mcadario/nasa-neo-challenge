"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Orbit } from "lucide-react";

const links = [
  { href: "/feed", label: "Feed" },
  { href: "/lookup", label: "Lookup" },
  { href: "/browse", label: "Browse" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/feed" className="flex items-center gap-2 font-semibold text-primary">
          <Orbit className="h-5 w-5" />
          <span className="hidden sm:inline">NeoWs Dashboard</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/20 hover:text-accent",
                pathname === l.href
                  ? "bg-accent/20 text-accent"
                  : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
        </div>
      </div>
    </header>
  );
}
