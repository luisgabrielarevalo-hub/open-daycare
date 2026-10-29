import type { LinkedParent } from "@/lib/data";

export type ParentRelationship = "father" | "mother" | "guardian";
export type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "cancelled";

export type InvitationRow = {
  id: string;
  child_id: string;
  full_name: string;
  email: string;
  relationship: ParentRelationship;
  status: InvitationStatus;
  code: string;
  expires_at: string;
};

export type ParentLinkRow = {
  parent_id: string;
  relationship: ParentRelationship;
};

const RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  mother: "Mamá",
  father: "Papá",
  guardian: "Tutor/a",
};

const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "PENDIENTE",
  accepted: "ACTIVO",
  expired: "VENCIDA",
  cancelled: "CANCELADA",
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

function hashId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function relationshipLabel(relationship: ParentRelationship): string {
  return RELATIONSHIP_LABELS[relationship] ?? "Tutor/a";
}

export function invitationStatusLabel(status: InvitationStatus): string {
  return STATUS_LABELS[status] ?? status.toUpperCase();
}

export function initialsFromName(fullName: string): string {
  return fullName.trim().charAt(0).toUpperCase() || "?";
}

export function avatarPalette(email: string): { bg: string; fg: string } {
  return AVATAR_PALETTE[
    hashId(email.trim().toLowerCase()) % AVATAR_PALETTE.length
  ];
}

export function toLinkedParents(
  invitations: InvitationRow[],
  links: ParentLinkRow[],
): LinkedParent[] {
  const hasActiveLinks = links.length > 0;
  const parents = new Map<string, LinkedParent>();

  for (const invitation of invitations) {
    if (invitation.status !== "pending" && invitation.status !== "accepted") {
      continue;
    }

    if (invitation.status === "accepted" && !hasActiveLinks) {
      continue;
    }

    const email = invitation.email.trim().toLowerCase();
    const current = parents.get(email);

    if (current?.status === "active") {
      continue;
    }

    const palette = avatarPalette(email);

    parents.set(email, {
      name: invitation.full_name,
      relationship: relationshipLabel(invitation.relationship),
      initial: initialsFromName(invitation.full_name),
      avatarBg: palette.bg,
      avatarColor: palette.fg,
      status: invitation.status === "accepted" ? "active" : "pending",
      statusLabel: invitationStatusLabel(invitation.status),
    });
  }

  return Array.from(parents.values());
}
