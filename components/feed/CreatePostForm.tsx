"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { children, type PostKind } from "@/lib/data";

const MAX_PHOTOS = 4;
const MAX_DESCRIPTION_LENGTH = 1000;

const RECIPIENT_IDS = [
  "mateo-fernandez",
  "sofia-mendez",
  "benjamin-ruiz",
] as const;

const recipients = RECIPIENT_IDS.flatMap((id) => {
  const child = children.find((item) => item.id === id);
  return child ? [{ ...child, id }] : [];
});

const POST_TYPES: Record<
  PostKind,
  { label: string; inactive: string; active: string }
> = {
  meal: {
    label: "Comida",
    inactive: "bg-meal-bg text-meal-fg",
    active: "bg-meal-fg text-white",
  },
  nap: {
    label: "Siesta",
    inactive: "bg-nap-bg text-nap-fg",
    active: "bg-nap-fg text-white",
  },
  activity: {
    label: "Actividad",
    inactive: "bg-activity-bg text-activity-fg",
    active: "bg-activity-fg text-white",
  },
  achievement: {
    label: "Logro",
    inactive: "bg-achievement-bg text-achievement-fg",
    active: "bg-achievement-fg text-white",
  },
  mood: {
    label: "Ánimo",
    inactive: "bg-mood-bg text-mood-fg",
    active: "bg-mood-fg text-white",
  },
  photo: {
    label: "Foto",
    inactive: "bg-kind-photo-bg text-kind-photo-fg",
    active: "bg-kind-photo-fg text-white",
  },
  announcement: {
    label: "Anuncio",
    inactive: "bg-announcement-bg text-announcement-fg",
    active: "bg-announcement-fg text-white",
  },
};

const POST_TYPE_ORDER = [
  "meal",
  "nap",
  "activity",
  "achievement",
  "mood",
  "photo",
  "announcement",
] as const;

export type ChildRecipientId = (typeof RECIPIENT_IDS)[number];

export type RecipientId = ChildRecipientId | "room";

export type PostDraft = {
  recipientIds: RecipientId[];
  kind: PostKind;
  body: string;
  photos: string[];
};

type CreatePostFormProps = {
  onCancel: () => void;
  onPublish: (draft: PostDraft) => void;
};

const labelClass =
  "mb-2.5 text-[12px] font-extrabold tracking-[0.7px] text-muted";
const groupClass = "mb-[22px]";

function getFirstName(fullName: string) {
  return fullName.split(" ")[0];
}

export function CreatePostForm({ onCancel, onPublish }: CreatePostFormProps) {
  const [recipientIds, setRecipientIds] = useState<RecipientId[]>([
    RECIPIENT_IDS[0],
  ]);
  const [kind, setKind] = useState<PostKind>("activity");
  const [body, setBody] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [hasTooManyPhotos, setHasTooManyPhotos] = useState(false);
  const photosRef = useRef<string[]>([]);
  const transferredRef = useRef(false);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      if (transferredRef.current) {
        return;
      }
      photosRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/"),
    );
    const remaining = MAX_PHOTOS - photos.length;
    const acceptedFiles = imageFiles.slice(0, remaining);

    if (acceptedFiles.length > 0) {
      setPhotos((current) => [
        ...current,
        ...acceptedFiles.map((file) => URL.createObjectURL(file)),
      ]);
    }

    if (imageFiles.length > remaining) {
      setHasTooManyPhotos(true);
    }

    event.target.value = "";
  }

  function removePhoto(url: string) {
    URL.revokeObjectURL(url);
    setPhotos((current) => current.filter((photo) => photo !== url));
    setHasTooManyPhotos(false);
  }

  function toggleChild(id: ChildRecipientId) {
    setRecipientIds((current) => {
      if (current.includes("room")) {
        return [id];
      }

      if (current.includes(id)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((recipient) => recipient !== id);
      }

      return [...current, id];
    });
  }

  function selectRoom() {
    setRecipientIds(["room"]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      setDescriptionError("Escribí una descripción");
      return;
    }

    transferredRef.current = true;
    onPublish({
      recipientIds,
      kind,
      body: body.trim(),
      photos,
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-border px-[26px] py-5">
        <button
          type="button"
          onClick={onCancel}
          className="text-[15px] font-bold text-muted"
        >
          Cancelar
        </button>
        <span
          id="create-post-title"
          className="font-display text-[18px] font-semibold text-ink"
        >
          Nueva publicación
        </span>
        <button
          type="submit"
          className="text-[15px] font-extrabold text-coral-deep-light"
        >
          Publicar
        </button>
      </div>

      <div className="px-[26px] py-6">
        <div
          role="group"
          aria-labelledby="post-recipient-label"
          className={groupClass}
        >
          <div id="post-recipient-label" className={labelClass}>
            PARA
          </div>
          <div className="flex flex-wrap gap-[9px]">
            {recipients.map((child) => {
              const isActive = recipientIds.includes(child.id);

              return (
                <button
                  key={child.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => toggleChild(child.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] py-1.5 pr-3.5 pl-1.5 text-[14px] font-bold ${
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-paper text-nav-inactive"
                  }`}
                >
                  <span
                    className="flex size-[26px] flex-none items-center justify-center rounded-full font-display text-[13px] font-semibold"
                    style={{
                      backgroundColor: child.avatarBg,
                      color: child.avatarColor,
                    }}
                  >
                    {child.fullName.charAt(0)}
                  </span>
                  {getFirstName(child.fullName)}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={recipientIds.includes("room")}
              onClick={selectRoom}
              className={`cursor-pointer rounded-full border-[1.5px] px-4 py-1.5 text-[14px] font-bold ${
                recipientIds.includes("room")
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-paper text-nav-inactive"
              }`}
            >
              Toda la sala
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-labelledby="post-type-label"
          className={groupClass}
        >
          <div id="post-type-label" className={labelClass}>
            TIPO
          </div>
          <div className="flex flex-wrap gap-[9px]">
            {POST_TYPE_ORDER.map((type) => {
              const style = POST_TYPES[type];
              const isActive = kind === type;

              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setKind(type)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-extrabold ${
                    isActive ? style.active : style.inactive
                  }`}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={groupClass}>
          <label htmlFor="post-description" className={`block ${labelClass}`}>
            DESCRIPCIÓN
          </label>
          <textarea
            id="post-description"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (descriptionError) {
                setDescriptionError("");
              }
            }}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Contá cómo le fue hoy…"
            aria-invalid={Boolean(descriptionError)}
            aria-describedby={
              descriptionError ? "post-description-error" : undefined
            }
            className="min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] border-field-border bg-white px-4 py-3.5 text-[15px] leading-[1.5] text-ink placeholder:text-field-placeholder focus:border-field-focus focus:outline-none"
          />
          {descriptionError && (
            <p
              id="post-description-error"
              className="mt-1.5 text-[12.5px] font-semibold text-danger"
            >
              {descriptionError}
            </p>
          )}
        </div>

        <div role="group" aria-labelledby="post-photos-label">
          <div id="post-photos-label" className={labelClass}>
            FOTOS
          </div>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo}
                className="relative size-24 overflow-hidden rounded-[14px] border border-border bg-photo-bg"
              >
                <Image
                  src={photo}
                  alt={`Foto ${index + 1} para la publicación`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <button
                  type="button"
                  aria-label={`Quitar foto ${index + 1}`}
                  onClick={() => removePhoto(photo)}
                  className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white"
                >
                  <CloseIcon width={14} height={14} strokeWidth={2.4} />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS ? (
              <>
                <label
                  htmlFor="post-photos"
                  className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-photo-dashed bg-photo-bg text-[12px] text-photo-fg"
                >
                  <PlusIcon className="text-coral-deep" width={22} height={22} />
                  Agregar
                </label>
                <input
                  id="post-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelection}
                  className="sr-only"
                />
              </>
            ) : null}
          </div>
          {hasTooManyPhotos && (
            <p className="mt-2.5 text-[12.5px] font-semibold text-danger">
              Podés adjuntar hasta 4 fotos
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
