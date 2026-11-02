import type { PostKind } from "@/lib/data";
import { formatTimeLabel, startOfTodayIso } from "@/lib/feed/dates";
import { avatarPalette } from "@/lib/kids/children";
import { createClient } from "@/lib/supabase/server";

export type FeedAudienceKind = "child" | "children" | "room";

export type FeedPost = {
  id: string;
  kind: PostKind;
  audienceKind: FeedAudienceKind;
  authorId: string;
  authorName: string;
  authorInitial: string;
  avatarBg: string;
  avatarColor: string;
  timeLabel: string;
  audienceLabel: string;
  body: string;
  photos: { path: string; url: string }[];
  reactions: number;
  comments: number;
};

export type RecipientOption = {
  id: string;
  fullName: string;
  firstName: string;
  avatarBg: string;
  avatarColor: string;
  photoConsent: boolean;
};

export type ComposerData = {
  daycareId: string;
  recipients: RecipientOption[];
  allChildrenPhotoConsent: boolean;
};

export type CompressedPhoto = {
  id: string;
  previewUrl: string;
  blob: Blob;
};

export type PostDraft = {
  recipientIds: (string | "room")[];
  kind: PostKind;
  body: string;
  photos: CompressedPhoto[];
};

export type PostRow = {
  id: string;
  type: PostKind;
  audience_kind: "children" | "daycare";
  body: string;
  published_at: string;
  author_id: string;
  author_name: string;
  post_children: { children: { full_name: string } | null }[];
  post_photos: { path: string; position: number }[];
};

const POST_PHOTOS_BUCKET = "post-photos";
const SIGNED_URL_TTL_SECONDS = 3600;

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function audienceFor(
  audienceKind: "children" | "daycare",
  childNames: string[],
): { audienceKind: FeedAudienceKind; label: string } {
  if (audienceKind === "daycare") {
    return { audienceKind: "room", label: "toda la sala" };
  }

  const sortedNames = [...childNames].sort((left, right) =>
    left.localeCompare(right, "es"),
  );

  if (sortedNames.length <= 1) {
    return {
      audienceKind: "child",
      label: `familia de ${firstName(sortedNames[0] ?? "")}`,
    };
  }

  return { audienceKind: "children", label: "sus familias" };
}

export function toFeedPost(
  row: PostRow,
  currentUserId: string,
  signedUrls: Map<string, string>,
): FeedPost {
  const childNames = (row.post_children ?? [])
    .map((entry) => entry.children?.full_name ?? "")
    .filter(Boolean);
  const audience = audienceFor(row.audience_kind, childNames);
  const palette = avatarPalette(row.author_id);
  const time = formatTimeLabel(row.published_at);

  const photos = [...(row.post_photos ?? [])]
    .sort((left, right) => left.position - right.position)
    .flatMap((photo) => {
      const url = signedUrls.get(photo.path);
      return url ? [{ path: photo.path, url }] : [];
    });

  return {
    id: row.id,
    kind: row.type,
    audienceKind: audience.audienceKind,
    authorId: row.author_id,
    authorName: row.author_name,
    authorInitial: row.author_name.trim().charAt(0).toUpperCase() || "?",
    avatarBg: palette.bg,
    avatarColor: palette.fg,
    timeLabel:
      row.author_id === currentUserId
        ? `${time} · publicado por vos`
        : time,
    audienceLabel: audience.label,
    body: row.body,
    photos,
    reactions: 0,
    comments: 0,
  };
}

export async function getTodayPosts(
  currentUserId: string,
): Promise<FeedPost[]> {
  const supabase = await createClient();
  const startOfToday = startOfTodayIso();
  const startOfTomorrow = new Date(
    new Date(startOfToday).getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, type, audience_kind, body, published_at, author_id, author_name, post_children(children(full_name)), post_photos(path, position)",
    )
    .gte("published_at", startOfToday)
    .lt("published_at", startOfTomorrow)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("No pudimos leer las publicaciones de hoy", error);
    return [];
  }

  const rows = (data ?? []) as unknown as PostRow[];
  const paths = [
    ...new Set(
      rows.flatMap((row) => (row.post_photos ?? []).map((photo) => photo.path)),
    ),
  ];
  const signedUrls = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(POST_PHOTOS_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    if (signedError) {
      console.error("No pudimos firmar las fotos del feed", signedError);
    }

    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) {
        signedUrls.set(item.path, item.signedUrl);
      }
    }
  }

  return rows.map((row) => toFeedPost(row, currentUserId, signedUrls));
}
