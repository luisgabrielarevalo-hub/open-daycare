import type { Child, ChildTag } from "@/lib/data";

export type RoomOption = {
  id: string;
  name: string;
};

export type ChildRow = {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  status: "active" | "archived";
  rooms: { name: string } | null;
};

export type ParsedAllergies = {
  tags: string[];
  notes: string | null;
};

const ALLERGY_TERMS: { tag: string; terms: string[] }[] = [
  { tag: "peanut", terms: ["mani", "cacahuete"] },
  { tag: "lactose", terms: ["lactosa", "lacteos"] },
  { tag: "gluten", terms: ["gluten", "trigo"] },
  { tag: "egg", terms: ["huevo", "huevos"] },
  { tag: "nuts", terms: ["frutos secos", "nuez", "nueces"] },
];

const ALLERGY_LABELS: Record<string, string> = {
  peanut: "MANÍ",
  lactose: "LACTOSA",
  gluten: "GLUTEN",
  egg: "HUEVO",
  nuts: "FRUTOS SECOS",
};

const AVATAR_PALETTE = [
  { bg: "#A9D9E8", fg: "#1F7A93" },
  { bg: "#F4B8CC", fg: "#C44A7A" },
  { bg: "#B9DEC4", fg: "#3E8B62" },
  { bg: "#F4DC8E", fg: "#9A7B1E" },
  { bg: "#C9B6E8", fg: "#7B5FC0" },
  { bg: "#C9B6E8", fg: "#FFFFFF" },
  { bg: "#A9C7E8", fg: "#FFFFFF" },
  { bg: "#B9DEC4", fg: "#FFFFFF" },
];

function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-AR", { month: "short" }).formatToParts(
    date,
  );
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return month.replace(/\.$/, "");
}

function hashId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseAllergies(value: string): ParsedAllergies {
  const terms = value
    .split(/[,;]+/)
    .map(normalizeTerm)
    .filter(Boolean);

  const tags: string[] = [];
  const unknown: string[] = [];

  for (const term of terms) {
    const match = ALLERGY_TERMS.find((entry) =>
      entry.terms.some(
        (candidate) => term === candidate || term.includes(candidate),
      ),
    );

    if (match) {
      if (!tags.includes(match.tag)) {
        tags.push(match.tag);
      }
    } else {
      unknown.push(term);
    }
  }

  return {
    tags,
    notes: unknown.length > 0 ? `Alergias: ${unknown.join(", ")}` : null,
  };
}

export function ageLabel(birthDate: string, today: Date = new Date()): string {
  const birth = parseDateOnly(birthDate);

  let years = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate());

  if (beforeBirthday) {
    years -= 1;
  }

  if (years >= 1) {
    return `${years} ${years === 1 ? "año" : "años"}`;
  }

  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());

  if (today.getDate() < birth.getDate()) {
    months -= 1;
  }

  const safeMonths = Math.max(0, months);
  return `${safeMonths} ${safeMonths === 1 ? "mes" : "meses"}`;
}

export function formatDateLabel(value: string): string {
  const date = parseDateOnly(value);
  const parts = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return `${day} ${monthLabel(date)} ${year}`;
}

export function formatMonthLabel(value: string): string {
  const date = parseDateOnly(value);
  const year = new Intl.DateTimeFormat("es-AR", { year: "numeric" }).format(
    date,
  );

  return `${monthLabel(date)} ${year}`;
}

export function avatarPalette(id: string): { bg: string; fg: string } {
  return AVATAR_PALETTE[hashId(id) % AVATAR_PALETTE.length];
}

export function toChildView(row: ChildRow): Child {
  const palette = avatarPalette(row.id);
  const tags: ChildTag[] = row.allergy_tags.map((tag) => ({
    label: ALLERGY_LABELS[tag] ?? tag.toUpperCase(),
    tone: "allergy",
  }));
  const room = row.rooms?.name ?? "";

  return {
    id: row.slug,
    fullName: row.full_name,
    ageLabel: ageLabel(row.birth_date),
    room,
    roomFullName: room ? `Sala ${room}` : "Sala",
    birthDateLabel: formatDateLabel(row.birth_date),
    joinedLabel: formatMonthLabel(row.enrolled_at),
    avatarBg: palette.bg,
    avatarColor: palette.fg,
    tag: tags[0],
    tags,
    allergiesNotes: row.medical_notes ?? undefined,
    parents: [],
  };
}
