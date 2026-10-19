"use client";

import { useState } from "react";
import { ChildCard } from "@/components/kids/ChildCard";
import { SearchIcon } from "@/components/ui/icons";
import { children } from "@/lib/data";

export function KidsDirectory() {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleChildren = normalizedQuery
    ? children.filter((child) =>
        child.fullName.toLowerCase().includes(normalizedQuery),
      )
    : children;

  return (
    <>
      <div className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-border bg-paper px-4 py-3">
        <SearchIcon className="flex-none text-[#B0A290]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar niño…"
          aria-label="Buscar niño"
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-soft"
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {visibleChildren.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>
    </>
  );
}
