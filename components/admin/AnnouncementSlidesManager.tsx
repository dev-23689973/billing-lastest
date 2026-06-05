"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadAnnouncementSlideAction } from "@/actions/clientData";
import {
  ANNOUNCEMENT_SLIDES_MAX_COUNT,
  ANNOUNCEMENT_SLIDE_MAX_BYTES,
  serializeAnnouncementSlides,
} from "@/lib/global-announcement-data";
import { cn } from "@/lib/cn";

type Props = {
  name: string;
  defaultSlides: string[];
};

function reorderSlides(slides: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= slides.length || to >= slides.length) {
    return slides;
  }
  const next = [...slides];
  const [item] = next.splice(from, 1);
  if (!item) return slides;
  next.splice(to, 0, item);
  return next;
}

export function AnnouncementSlidesManager({ name, defaultSlides }: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [slides, setSlides] = useState(defaultSlides);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setError(null);

    const remaining = ANNOUNCEMENT_SLIDES_MAX_COUNT - slides.length;
    if (remaining <= 0) {
      setError(`Maximum ${ANNOUNCEMENT_SLIDES_MAX_COUNT} slides.`);
      return;
    }

    const batch = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      for (const file of batch) {
        if (file.size > ANNOUNCEMENT_SLIDE_MAX_BYTES) {
          setError("Each image must be 5 MB or smaller.");
          continue;
        }
        const fd = new FormData();
        fd.set("file", file);
        const data = await uploadAnnouncementSlideAction(fd);
        if (!data.ok || !data.path) {
          setError(
            data.error === "unsupported_type"
              ? "Use JPEG, PNG, WebP, or GIF."
              : data.error === "file_too_large"
                ? "Image is too large (max 5 MB)."
                : "Upload failed. Try again.",
          );
          continue;
        }
        setSlides((prev) => (prev.includes(data.path) ? prev : [...prev, data.path]));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragStart(e: DragEvent<HTMLLIElement>, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 48, 32);
    }
  }

  function handleDragOver(e: DragEvent<HTMLLIElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && dragIndex !== index) setOverIndex(index);
  }

  function handleDrop(e: DragEvent<HTMLLIElement>, index: number) {
    e.preventDefault();
    const from =
      dragIndex ?? (Number.parseInt(e.dataTransfer.getData("text/plain"), 10) || Number.NaN);
    if (!Number.isNaN(from)) {
      setSlides((prev) => reorderSlides(prev, from, index));
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={serializeAnnouncementSlides(slides)} readOnly />

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          disabled={uploading || slides.length >= ANNOUNCEMENT_SLIDES_MAX_COUNT}
          onChange={(e) => void onFilesSelected(e.target.files)}
        />
        <button
          type="button"
          disabled={uploading || slides.length >= ANNOUNCEMENT_SLIDES_MAX_COUNT}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 text-xs font-medium text-foreground",
            "transition hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          )}
          Upload slide image
        </button>
        <span className="text-[11px] text-muted-foreground">
          {slides.length}/{ANNOUNCEMENT_SLIDES_MAX_COUNT} · drag to reorder
        </span>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {slides.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {slides.map((path, index) => (
            <li
              key={path}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={() => setOverIndex((prev) => (prev === index ? null : prev))}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group relative h-11 w-[4.5rem] shrink-0 overflow-hidden rounded border bg-black/30",
                "border-border/60 transition-[opacity,box-shadow,border-color] duration-150",
                dragIndex === index && "opacity-45",
                overIndex === index && "border-cyan-400/50 ring-1 ring-cyan-400/35",
              )}
            >
              <Image
                src={path}
                alt={`Slide ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
                sizes="72px"
                draggable={false}
              />

              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-70 group-hover:opacity-100"
                aria-hidden
              />

              <span
                className="absolute left-0.5 top-0.5 z-[2] flex h-5 w-5 cursor-grab items-center justify-center rounded-sm bg-black/50 text-white/90 active:cursor-grabbing"
                title="Drag to reorder"
                aria-hidden
              >
                <GripVertical className="h-3 w-3" strokeWidth={2} />
              </span>

              <button
                type="button"
                title="Remove slide"
                aria-label={`Remove slide ${index + 1}`}
                onClick={() => removeAt(index)}
                onDragStart={(e) => e.preventDefault()}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "absolute right-0.5 top-0.5 z-[2] flex h-5 w-5 items-center justify-center rounded-sm",
                  "bg-black/50 text-red-300 transition hover:bg-destructive/80 hover:text-white",
                )}
              >
                <Trash2 className="h-3 w-3" strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No slide images yet. Upload promo banners for the announcement carousel.
        </p>
      )}
    </div>
  );
}
