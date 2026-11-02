import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompressedPhoto } from "@/lib/feed/posts";

export const POST_PHOTOS_BUCKET = "post-photos";

export type UploadPostPhotosResult = {
  paths: string[];
  error: Error | null;
};

export function postPhotoPath(
  daycareId: string,
  draftId: string,
  index: number,
): string {
  return `${daycareId}/${draftId}/${index}.webp`;
}

export async function uploadPostPhotos(
  supabase: SupabaseClient,
  daycareId: string,
  draftId: string,
  photos: CompressedPhoto[],
): Promise<UploadPostPhotosResult> {
  const paths: string[] = [];

  for (const [index, photo] of photos.entries()) {
    const path = postPhotoPath(daycareId, draftId, index);
    const { error } = await supabase.storage
      .from(POST_PHOTOS_BUCKET)
      .upload(path, photo.blob, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return { paths, error: new Error(error.message) };
    }

    paths.push(path);
  }

  return { paths, error: null };
}
