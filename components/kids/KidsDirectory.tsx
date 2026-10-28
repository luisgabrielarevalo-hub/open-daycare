"use client";

import { useState } from "react";
import { AddChildModal } from "@/components/kids/AddChildModal";
import { ChildCard } from "@/components/kids/ChildCard";
import { SearchIcon } from "@/components/ui/icons";
import type { Child } from "@/lib/data";
import type { RoomOption } from "@/lib/kids/children";

const ROOM_ORDER = ["Soles", "Lunas", "Estrellas"];

type KidsDirectoryProps = {
  rooms: RoomOption[];
  children: Child[];
};

export function KidsDirectory({ rooms, children }: KidsDirectoryProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleChildren = normalizedQuery
    ? children.filter((child) =>
        child.fullName.toLowerCase().includes(normalizedQuery),
      )
    : children;

  const groups = new Map<string, Child[]>();

  for (const child of visibleChildren) {
    const room = child.room || "Sin sala";
    const group = groups.get(room) ?? [];
    group.push(child);
    groups.set(room, group);
  }

  const orderedRooms = [
    ...ROOM_ORDER.filter((room) => groups.has(room)),
    ...[...groups.keys()]
      .filter((room) => !ROOM_ORDER.includes(room))
      .sort((a, b) => a.localeCompare(b)),
  ];

  const hasChildren = children.length > 0;

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

      {hasChildren ? (
        orderedRooms.map((room) => {
          const group = groups.get(room) ?? [];

          return (
            <div key={room} className="mb-6">
              <div className="mb-3.5 flex items-center gap-3">
                <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-ink">
                  SALA {room.toUpperCase()}
                </span>
                <span className="text-[13px] text-muted-soft">
                  {group.length} {group.length === 1 ? "niño" : "niños"}
                </span>
                <span className="h-px flex-1 bg-divider" />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {group.map((child) => (
                  <ChildCard key={child.id} child={child} />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-border bg-paper px-6 py-12 text-center">
          <div>
            <p className="font-display text-[19px] font-semibold text-ink">
              Todavía no hay niños
            </p>
            <p className="mt-1.5 text-[14px] text-muted">
              Agregá al primer niño para verlo en el directorio.
            </p>
          </div>
          <AddChildModal rooms={rooms} />
        </div>
      )}
    </>
  );
}
