"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Bold,
  Eraser,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Sparkles,
  Underline,
} from "lucide-react";
import { AnnouncementEditorFontFamilySelect } from "@/components/admin/AnnouncementEditorFontFamilySelect";
import { AnnouncementEditorFontSizeControl } from "@/components/admin/AnnouncementEditorFontSizeControl";
import { settingsTextareaShellClass } from "@/components/admin/settings-ui";
import {
  ANNOUNCEMENT_COMPOSER_TITLE_CLASS,
  applyFlashToTitleElement,
  initialBodyEditorHtml,
  serializeFlashFromTitleElement,
} from "@/lib/announcement-editor-sync";
import type { AnnouncementFlashHeading } from "@/lib/announcement-flash";
import { uploadAnnouncementSlideAction } from "@/actions/clientData";
import { ANNOUNCEMENT_TEXT_COLORS } from "@/lib/announcement-typography";
import {
  captureEditorSelection,
  pinEditorSelection,
  restoreEditorSelection,
  reselectElementContents,
} from "@/lib/announcement-editor-selection";
import {
  applyFontFamily,
  applyFontSize,
  applyTextColor,
  applyTitleColor,
  applyTitleFontFamily,
  applyTitleFontSize,
  ANNOUNCEMENT_IMAGE_WIDTH_PRESETS,
  clearEditorFormatting,
  clearTitleFormatting,
  execEditorCommand,
  getEditorImageFromNode,
  initEditorParagraphMode,
  insertImageAtSelection,
  insertLinkAtSelection,
  readEditorImageWidthPercent,
  removeEditorImage,
  selectEditorImage,
  setEditorImageWidth,
  syncEditorHtml,
  toggleBulletList,
  toggleNumberedList,
  toggleTitleBold,
  toggleTitleItalic,
  toggleTitleUnderline,
} from "@/lib/announcement-rich-editor-commands";
import { cn } from "@/lib/cn";

type EditorZone = "title" | "body";

type SelectedImageLayout = {
  frame: { top: number; left: number; width: number; height: number };
  toolbar: { top: number; left: number };
  handle: { top: number; left: number };
};

const IMAGE_TOOLBAR_HEIGHT = 36;

type Props = {
  bodyName: string;
  flashName: string;
  defaultBody: string;
  defaultFlash: AnnouncementFlashHeading | null;
  bodyId?: string;
};

function ToolbarButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-1.5 text-muted-foreground",
        "transition-[color,background-color] duration-200 ease-out",
        "hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active && "bg-card text-foreground shadow-sm",
      )}
    >
      {children}
    </button>
  );
}

export function AnnouncementComposerEditor({
  bodyName,
  flashName,
  defaultBody,
  defaultFlash,
  bodyId: bodyIdProp,
}: Props) {
  const autoId = useId();
  const bodyFieldId = bodyIdProp ?? `global_msg-${autoId}`;
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const activeZoneRef = useRef<EditorZone>("body");
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const imageResizeRef = useRef<{ startX: number; startWidth: number; editorWidth: number } | null>(null);

  const [bodyHtml, setBodyHtml] = useState(defaultBody);
  const [flashJson, setFlashJson] = useState("");
  const [flashAnim, setFlashAnim] = useState(defaultFlash?.flash !== false);
  const [activeZone, setActiveZone] = useState<EditorZone>("body");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageLayout, setImageLayout] = useState<SelectedImageLayout | null>(null);

  const syncAll = useCallback(() => {
    setFlashJson(serializeFlashFromTitleElement(titleRef.current, flashAnim));
    setBodyHtml(syncEditorHtml(bodyRef.current));
  }, [flashAnim]);

  useEffect(() => {
    function onSelectionChange() {
      captureEditorSelection(titleRef.current);
      captureEditorSelection(bodyRef.current);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  useEffect(() => {
    const titleEl = titleRef.current;
    const bodyEl = bodyRef.current;
    if (!titleEl || !bodyEl || initializedRef.current) return;

    titleEl.dataset.placeholder = "Flash heading — click to edit (optional)";
    applyFlashToTitleElement(titleEl, defaultFlash, flashAnim);
    bodyEl.innerHTML = initialBodyEditorHtml(defaultBody);
    initEditorParagraphMode(bodyEl);

    initializedRef.current = true;
    setFlashJson(serializeFlashFromTitleElement(titleEl, flashAnim));
    setBodyHtml(syncEditorHtml(bodyEl));
  }, [defaultBody, defaultFlash, flashAnim]);

  useEffect(() => {
    if (!initializedRef.current) return;
    titleRef.current?.classList.toggle("announcement-flash-heading--animate", flashAnim);
    setFlashJson(serializeFlashFromTitleElement(titleRef.current, flashAnim));
  }, [flashAnim]);

  const focusZone = useCallback((zone: EditorZone) => {
    activeZoneRef.current = zone;
    setActiveZone(zone);
    const editor = zone === "title" ? titleRef.current : bodyRef.current;
    editor?.focus();
    captureEditorSelection(editor);
  }, []);

  const keepEditorSelection = useCallback(() => {
    const editor = activeZoneRef.current === "title" ? titleRef.current : bodyRef.current;
    restoreEditorSelection(editor);
  }, []);

  const positionImageControls = useCallback((img: HTMLImageElement | null) => {
    if (!img || !panelRef.current) {
      setImageLayout(null);
      return;
    }
    const panelRect = panelRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const frame = {
      top: imgRect.top - panelRect.top,
      left: imgRect.left - panelRect.left,
      width: imgRect.width,
      height: imgRect.height,
    };

    let toolbarTop = frame.top - IMAGE_TOOLBAR_HEIGHT - 8;
    if (toolbarTop < 6) toolbarTop = frame.top + frame.height + 8;

    setImageLayout({
      frame,
      toolbar: { top: toolbarTop, left: frame.left },
      handle: {
        top: frame.top + frame.height - 7,
        left: frame.left + frame.width - 7,
      },
    });
  }, []);

  const clearSelectedImage = useCallback(() => {
    selectedImageRef.current = null;
    setSelectedImage(null);
    setImageLayout(null);
    selectEditorImage(null, bodyRef.current);
  }, []);

  const selectBodyImage = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) {
        clearSelectedImage();
        return;
      }
      activeZoneRef.current = "body";
      setActiveZone("body");
      selectedImageRef.current = img;
      setSelectedImage(img);
      selectEditorImage(img, bodyRef.current);
      positionImageControls(img);
    },
    [clearSelectedImage, positionImageControls],
  );

  useEffect(() => {
    if (!selectedImage) return;
    function reposition() {
      if (selectedImageRef.current) positionImageControls(selectedImageRef.current);
    }
    window.addEventListener("resize", reposition);
    bodyRef.current?.addEventListener("scroll", reposition, { passive: true });
    return () => {
      window.removeEventListener("resize", reposition);
      bodyRef.current?.removeEventListener("scroll", reposition);
    };
  }, [selectedImage, positionImageControls]);

  const run = useCallback(
    (fn: () => void) => {
      const zone = activeZoneRef.current;
      const editor = zone === "title" ? titleRef.current : bodyRef.current;
      restoreEditorSelection(editor);
      editor?.focus({ preventScroll: true });
      fn();
      reselectElementContents(editor);
      captureEditorSelection(editor);
      syncAll();
    },
    [syncAll],
  );

  const runBodyBlock = useCallback(
    (fn: () => void) => {
      clearSelectedImage();
      const editor = bodyRef.current;
      activeZoneRef.current = "body";
      setActiveZone("body");
      restoreEditorSelection(editor);
      editor?.focus({ preventScroll: true });
      fn();
      captureEditorSelection(editor);
      syncAll();
    },
    [clearSelectedImage, syncAll],
  );

  const runTitle = useCallback(
    (apply: (el: HTMLElement) => void) => {
      activeZoneRef.current = "title";
      setActiveZone("title");
      const el = titleRef.current;
      if (!el) return;
      restoreEditorSelection(el);
      el.focus({ preventScroll: true });
      apply(el);
      reselectElementContents(el);
      captureEditorSelection(el);
      syncAll();
    },
    [syncAll],
  );

  function applyImageWidth(widthPercent: number) {
    const img = selectedImageRef.current;
    if (!img) return;
    setEditorImageWidth(img, widthPercent);
    positionImageControls(img);
    syncAll();
  }

  function startImageResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const img = selectedImageRef.current;
    const editor = bodyRef.current;
    if (!img || !editor) return;

    const editorWidth = editor.clientWidth;
    imageResizeRef.current = {
      startX: e.clientX,
      startWidth: img.getBoundingClientRect().width,
      editorWidth,
    };

    function onMove(ev: MouseEvent) {
      const state = imageResizeRef.current;
      const activeImg = selectedImageRef.current;
      if (!state || !activeImg) return;
      const nextWidth = Math.max(48, Math.min(state.editorWidth, state.startWidth + (ev.clientX - state.startX)));
      const widthPercent = Math.round((nextWidth / state.editorWidth) * 100);
      setEditorImageWidth(activeImg, widthPercent);
      positionImageControls(activeImg);
    }

    function onUp() {
      imageResizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      syncAll();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function deleteSelectedImage() {
    const img = selectedImageRef.current;
    if (!img) return;
    removeEditorImage(img, bodyRef.current);
    clearSelectedImage();
    syncAll();
  }

  async function onImageSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      focusZone("body");
      const fd = new FormData();
      fd.set("file", file);
      const data = await uploadAnnouncementSlideAction(fd);
      if (!data.ok || !data.path) {
        setUploadError(
          data.error === "unsupported_type"
            ? "Use JPEG, PNG, WebP, or GIF."
            : data.error === "file_too_large"
              ? "Image is too large (max 5 MB)."
              : "Upload failed. Try again.",
        );
        return;
      }
      run(() => {
        insertImageAtSelection(data.path, file.name.replace(/\.[^.]+$/, ""), bodyRef.current);
        const img = Array.from(bodyRef.current?.querySelectorAll("img") ?? []).find(
          (node) => node.getAttribute("src") === data.path,
        );
        if (img instanceof HTMLImageElement) selectBodyImage(img);
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={flashName} value={flashJson} readOnly />
      <input type="hidden" name={bodyName} value={bodyHtml} readOnly />

      <div
        className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-muted/25 p-1"
        onMouseDownCapture={() => {
          pinEditorSelection(titleRef.current);
          pinEditorSelection(bodyRef.current);
        }}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-announcement-toolbar-popover]")) return;
          if (target.closest('input[type="color"]')) return;
          e.preventDefault();
        }}
      >
        <span
          className={cn(
            "mr-1 hidden rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide sm:inline",
            activeZone === "title"
              ? "bg-primary/15 text-primary"
              : "bg-muted/50 text-muted-foreground",
          )}
        >
          {activeZone === "title" ? "Editing title" : "Editing body"}
        </span>

        <ToolbarButton
          label="Bold"
          onClick={() =>
            activeZoneRef.current === "title"
              ? runTitle(toggleTitleBold)
              : run(() => execEditorCommand("bold", undefined, bodyRef.current))
          }
        >
          <Bold className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          onClick={() =>
            activeZoneRef.current === "title"
              ? runTitle(toggleTitleItalic)
              : run(() => execEditorCommand("italic", undefined, bodyRef.current))
          }
        >
          <Italic className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          onClick={() =>
            activeZoneRef.current === "title"
              ? runTitle(toggleTitleUnderline)
              : run(() => execEditorCommand("underline", undefined, bodyRef.current))
          }
        >
          <Underline className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
        <span className="mx-0.5 hidden h-5 w-px bg-border/80 sm:inline" aria-hidden />
        <ToolbarButton
          label="Bullet list"
          onClick={() => runBodyBlock(() => toggleBulletList(bodyRef.current))}
        >
          <List className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          onClick={() => runBodyBlock(() => toggleNumberedList(bodyRef.current))}
        >
          <ListOrdered className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
        <span className="mx-0.5 hidden h-5 w-px bg-border/80 sm:inline" aria-hidden />

        <AnnouncementEditorFontSizeControl
          onKeepSelection={keepEditorSelection}
          onApply={(size) =>
            activeZoneRef.current === "title"
              ? runTitle((el) => applyTitleFontSize(el, size))
              : run(() => applyFontSize(size, bodyRef.current))
          }
        />

        <AnnouncementEditorFontFamilySelect
          onKeepSelection={keepEditorSelection}
          onApply={(family) =>
            activeZoneRef.current === "title"
              ? runTitle((el) => applyTitleFontFamily(el, family))
              : run(() => applyFontFamily(family, bodyRef.current))
          }
        />

        <div className="flex items-center gap-0.5 rounded-md border border-border/50 bg-background/40 px-1 py-0.5">
          {ANNOUNCEMENT_TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={`Text color ${color}`}
              aria-label={`Text color ${color}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                activeZoneRef.current === "title"
                  ? runTitle((el) => applyTitleColor(el, color))
                  : run(() => applyTextColor(color, bodyRef.current))
              }
              className="h-5 w-5 rounded-full border border-black/10 shadow-sm transition hover:scale-110"
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="relative ml-0.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border">
            <span className="sr-only">Custom text color</span>
            <input
              type="color"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) =>
                activeZoneRef.current === "title"
                  ? runTitle((el) => applyTitleColor(el, e.target.value))
                  : run(() => applyTextColor(e.target.value, bodyRef.current))
              }
            />
          </label>
        </div>

        <span className="mx-0.5 hidden h-5 w-px bg-border/80 sm:inline" aria-hidden />

        <ToolbarButton
          label="Link"
          onClick={() =>
            run(() => {
              const url = window.prompt("Link URL", "https://");
              if (!url?.trim()) return;
              insertLinkAtSelection(url.trim(), undefined, bodyRef.current);
            })
          }
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={() => fileRef.current?.click()} active={uploading}>
          <ImagePlus className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void onImageSelected(e.target.files)}
        />

        <span className="mx-0.5 hidden h-5 w-px bg-border/80 sm:inline" aria-hidden />

        <ToolbarButton
          label="Title flash animation"
          active={flashAnim}
          onClick={() => setFlashAnim((v) => !v)}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>

        <ToolbarButton
          label="Clear formatting"
          onClick={() => {
            const zone = activeZoneRef.current;
            const target = zone === "title" ? titleRef.current : bodyRef.current;
            if (!target?.innerText.trim() || window.confirm(`Clear ${zone} formatting?`)) {
              if (zone === "title") {
                clearTitleFormatting(target!);
              } else {
                clearEditorFormatting(bodyRef.current);
              }
              syncAll();
            }
          }}
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden />
        </ToolbarButton>
      </div>

      <div
        className={cn(
          settingsTextareaShellClass,
          "announcement-editor-shell h-[min(50vh,22rem)] min-h-[min(50vh,22rem)] max-h-[min(50vh,22rem)] flex-col items-stretch gap-0 overflow-hidden p-0",
        )}
      >
        <div
          ref={panelRef}
          className={cn(
            "announcement-modal-body-panel relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] border-0",
            "border-slate-200/90 bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_2px_rgba(15,23,42,0.04)]",
            "dark:border-cyan-500/20 dark:bg-[hsl(222_38%_7%/0.92)]",
          )}
        >
          <div
            ref={titleRef}
            role="textbox"
            aria-label="Announcement flash heading"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Flash heading — click to edit (optional)"
            className={cn(
              ANNOUNCEMENT_COMPOSER_TITLE_CLASS,
              "shrink-0 border-b border-slate-200/70 px-4 py-3 dark:border-cyan-500/15 sm:px-5",
              flashAnim && "announcement-flash-heading--animate",
              "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset",
            )}
            style={{ minHeight: "2.75rem" }}
            onFocus={() => {
              clearSelectedImage();
              focusZone("title");
            }}
            onMouseUp={() => captureEditorSelection(titleRef.current)}
            onKeyUp={() => captureEditorSelection(titleRef.current)}
            onInput={syncAll}
            onBlur={syncAll}
          />

          <div
            ref={bodyRef}
            id={bodyFieldId}
            role="textbox"
            aria-multiline="true"
            aria-label="Announcement message body"
            contentEditable
            suppressContentEditableWarning
            className={cn(
              "announcement-modal-body announcement-rich-editor-surface thin-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 outline-none sm:px-5 sm:py-4",
              "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset",
            )}
            onFocus={() => focusZone("body")}
            onClick={(e) => {
              const img = getEditorImageFromNode(e.target as Node, bodyRef.current);
              if (img) {
                e.preventDefault();
                selectBodyImage(img);
                return;
              }
              clearSelectedImage();
            }}
            onKeyDown={(e) => {
              if (!selectedImageRef.current) return;
              if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                deleteSelectedImage();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                clearSelectedImage();
              }
            }}
            onMouseUp={() => captureEditorSelection(bodyRef.current)}
            onKeyUp={() => captureEditorSelection(bodyRef.current)}
            onInput={() => {
              if (selectedImageRef.current && !bodyRef.current?.contains(selectedImageRef.current)) {
                clearSelectedImage();
              }
              syncAll();
            }}
            onBlur={syncAll}
          />

          {selectedImage && imageLayout ? (
            <>
              <div
                className="announcement-editor-image-frame"
                style={{
                  top: imageLayout.frame.top,
                  left: imageLayout.frame.left,
                  width: imageLayout.frame.width,
                  height: imageLayout.frame.height,
                }}
                aria-hidden
              />
              <div
                className="announcement-editor-image-controls"
                style={{ top: imageLayout.toolbar.top, left: imageLayout.toolbar.left }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {ANNOUNCEMENT_IMAGE_WIDTH_PRESETS.map((width) => (
                  <button
                    key={width}
                    type="button"
                    data-active={readEditorImageWidthPercent(selectedImage) === width ? "true" : undefined}
                    onClick={() => applyImageWidth(width)}
                  >
                    {width}%
                  </button>
                ))}
                <button type="button" data-danger="true" onClick={deleteSelectedImage}>
                  Remove
                </button>
              </div>
              <div
                className="announcement-editor-image-resize-handle"
                style={{ top: imageLayout.handle.top, left: imageLayout.handle.left }}
                title="Drag to resize"
                aria-label="Drag to resize image"
                onMouseDown={startImageResize}
              />
            </>
          ) : null}
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Click the title or body to format. Click an image to resize (drag the corner handle or use presets) or remove it.
        </span>
        {uploadError ? <span className="text-destructive">{uploadError}</span> : null}
        <span className="tabular-nums">{bodyHtml.length + flashJson.length} characters</span>
      </p>
    </div>
  );
}
