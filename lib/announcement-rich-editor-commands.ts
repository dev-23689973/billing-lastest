/** Client helpers for the announcement WYSIWYG editor (contenteditable). */

export {
  ANNOUNCEMENT_FONT_FAMILIES,
  announcementFontSizeOptions,
  ANNOUNCEMENT_TEXT_COLORS,
  resolveAnnouncementFontFamily,
} from "@/lib/announcement-typography";

import { resolveAnnouncementFontFamily } from "@/lib/announcement-typography";
import { prepareEditorCommand, reselectElementContents } from "@/lib/announcement-editor-selection";

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4"]);

function getSelectionRange(): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0);
}

export function focusEditor(editor: HTMLElement | null) {
  editor?.focus();
}

export function syncEditorHtml(editor: HTMLElement | null): string {
  return editor?.innerHTML.trim() ?? "";
}

export function execEditorCommand(command: string, value?: string, editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);
  document.execCommand(command, false, value);
}

export function toggleBulletList(editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);
  document.execCommand("insertUnorderedList", false);
}

export function toggleNumberedList(editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);
  document.execCommand("insertOrderedList", false);
}

export const ANNOUNCEMENT_IMAGE_WIDTH_PRESETS = [25, 50, 75, 100] as const;

export function getEditorImageFromNode(node: Node | null, editor: HTMLElement | null): HTMLImageElement | null {
  if (!editor || !node) return null;
  if (node instanceof HTMLImageElement && editor.contains(node)) return node;
  if (node instanceof Element) {
    const img = node.closest("img");
    if (img instanceof HTMLImageElement && editor.contains(img)) return img;
  }
  return null;
}

export function getSelectedEditorImage(editor: HTMLElement | null): HTMLImageElement | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return getEditorImageFromNode(range.commonAncestorContainer, editor);
}

export function selectEditorImage(img: HTMLImageElement | null, editor?: HTMLElement | null) {
  editor?.querySelectorAll("img.announcement-editor-image--selected").forEach((node) => {
    node.classList.remove("announcement-editor-image--selected");
  });
  if (!img) return;

  img.classList.add("announcement-editor-image--selected");
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNode(img);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function readEditorImageWidthPercent(img: HTMLImageElement): number {
  const inline = img.style.width.trim();
  if (inline.endsWith("%")) {
    const parsed = Number.parseInt(inline, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 100;
}

export function setEditorImageWidth(img: HTMLImageElement, widthPercent: number) {
  const clamped = Math.min(100, Math.max(10, Math.round(widthPercent)));
  img.style.width = `${clamped}%`;
  img.style.maxWidth = "100%";
  img.style.height = "auto";
  img.style.borderRadius = "0.375rem";
  img.style.display = "block";
}

export function removeEditorImage(img: HTMLImageElement, editor?: HTMLElement | null) {
  const parent = img.parentElement;
  img.remove();
  if (parent && editor?.contains(parent)) {
    const leftover = parent.innerText.replace(/\u00a0/g, " ").trim();
    if (!leftover && parent.querySelector("img") === null && parent !== editor) {
      parent.remove();
    }
  }
  selectEditorImage(null, editor);
}

function getEditorRoot(range: Range, editor?: HTMLElement | null): HTMLElement | null {
  if (editor) return editor;
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node instanceof HTMLElement) {
    if (node.isContentEditable) return node;
    node = node.parentElement;
  }
  return null;
}

function createInlineStyleSpan(style: Record<string, string>): HTMLSpanElement {
  const span = document.createElement("span");
  span.style.display = "inline";
  for (const [key, val] of Object.entries(style)) {
    span.style.setProperty(key, val);
  }
  return span;
}

function wrapTextNodePortion(textNode: Text, range: Range, style: Record<string, string>): HTMLSpanElement | null {
  let node = textNode;
  let start = 0;
  let end = node.length;

  if (range.startContainer === node) start = range.startOffset;
  if (range.endContainer === node) end = range.endOffset;
  if (start >= end) return null;

  if (start > 0) node = node.splitText(start);
  if (end - start < node.length) node.splitText(end - start);

  const span = createInlineStyleSpan(style);
  const parent = node.parentNode;
  if (!parent) return null;
  parent.insertBefore(span, node);
  span.appendChild(node);
  return span;
}

/** Wrap each intersecting text slice — safe when the range crosses block boundaries. */
function wrapIntersectingTextNodes(
  range: Range,
  style: Record<string, string>,
  root: HTMLElement,
): HTMLSpanElement | null {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    if (text.textContent && range.intersectsNode(text)) {
      textNodes.push(text);
    }
    node = walker.nextNode();
  }
  if (textNodes.length === 0) return null;

  let firstSpan: HTMLSpanElement | null = null;
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const span = wrapTextNodePortion(textNodes[i]!, range, style);
    if (span && !firstSpan) firstSpan = span;
  }
  return firstSpan;
}

export function wrapSelectionWithStyle(style: Record<string, string>, editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);

  const range = getSelectionRange();
  if (!range || range.collapsed) return false;

  const span = createInlineStyleSpan(style);

  try {
    range.surroundContents(span);
  } catch {
    const root = getEditorRoot(range, editor);
    if (!root) return false;
    const wrapped = wrapIntersectingTextNodes(range, style, root);
    if (!wrapped) return false;
    span.remove();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(wrapped);
    sel?.addRange(next);
    return true;
  }

  const sel = window.getSelection();
  sel?.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(span);
  sel?.addRange(next);
  return true;
}

const INLINE_FONT_LINE_HEIGHT = "1.35";

function fontSizeStyle(size: string): Record<string, string> {
  return { "font-size": size, "line-height": INLINE_FONT_LINE_HEIGHT };
}

function applyFontSizeToElement(el: HTMLElement, size: string) {
  el.style.fontSize = size;
  el.style.lineHeight = INLINE_FONT_LINE_HEIGHT;
}

function normalizeBlockText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function getEditableBlock(range: Range, editor: HTMLElement): HTMLElement | null {
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node && node !== editor) {
    if (node instanceof HTMLElement && BLOCK_TAGS.has(node.tagName)) return node;
    node = node.parentElement;
  }
  return null;
}

function isFullBlockSelection(range: Range, block: HTMLElement): boolean {
  const selected = normalizeBlockText(range.toString());
  const blockText = normalizeBlockText(block.innerText);
  return selected.length > 0 && selected === blockText;
}

function stripInlineFontSizeStyles(block: HTMLElement) {
  block.querySelectorAll("span[style]").forEach((node) => {
    const span = node as HTMLElement;
    if (!span.style.fontSize) return;
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    span.remove();
  });
}

function fontFamilyStyle(family: string): Record<string, string> {
  return { "font-family": family };
}

function applyFontFamilyToElement(el: HTMLElement, family: string) {
  el.style.fontFamily = family;
}

function stripInlineFontFamilyStyles(block: HTMLElement) {
  block.querySelectorAll("span[style]").forEach((node) => {
    const span = node as HTMLElement;
    if (!span.style.fontFamily) return;
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    span.remove();
  });
}

export function applyFontSize(size: string, editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);
  const range = getSelectionRange();
  if (!range || !editor) return;

  const block = getEditableBlock(range, editor);

  if (block && isFullBlockSelection(range, block)) {
    applyFontSizeToElement(block, size);
    stripInlineFontSizeStyles(block);
    reselectElementContents(editor);
    return;
  }

  if (!range.collapsed && wrapSelectionWithStyle(fontSizeStyle(size), editor)) {
    reselectElementContents(editor);
    return;
  }

  if (block) {
    applyFontSizeToElement(block, size);
    stripInlineFontSizeStyles(block);
  } else {
    applyFontSizeToElement(editor, size);
  }
  reselectElementContents(editor);
}

export function applyTextColor(color: string, editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);
  if (wrapSelectionWithStyle({ color }, null)) return;

  const range = getSelectionRange();
  const block =
    range?.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : range?.commonAncestorContainer.parentElement;
  if (block && editor?.contains(block)) {
    block.style.color = color;
  } else if (editor) {
    editor.style.color = color;
  }
}

export function applyFontFamily(familyKey: string | undefined | null, editor?: HTMLElement | null) {
  const family = resolveAnnouncementFontFamily(familyKey);
  if (editor) prepareEditorCommand(editor);
  const range = getSelectionRange();
  if (!range || !editor) return;

  const block = getEditableBlock(range, editor);

  if (block && isFullBlockSelection(range, block)) {
    applyFontFamilyToElement(block, family);
    stripInlineFontFamilyStyles(block);
    reselectElementContents(editor);
    return;
  }

  if (!range.collapsed && wrapSelectionWithStyle(fontFamilyStyle(family), editor)) {
    reselectElementContents(editor);
    return;
  }

  if (block) {
    applyFontFamilyToElement(block, family);
    stripInlineFontFamilyStyles(block);
  } else {
    applyFontFamilyToElement(editor, family);
  }
  reselectElementContents(editor);
}

export function applyTitleFontSize(el: HTMLElement, size: string) {
  applyFontSizeToElement(el, size);
  unwrapTitleInlineFormatting(el);
}

export function applyTitleColor(el: HTMLElement, color: string) {
  el.style.color = color;
  unwrapTitleInlineFormatting(el);
}

export function applyTitleFontFamily(el: HTMLElement, familyKey: string | undefined | null) {
  el.style.fontFamily = resolveAnnouncementFontFamily(familyKey);
  unwrapTitleInlineFormatting(el);
}

export function toggleTitleBold(el: HTMLElement) {
  const weight = el.style.fontWeight || window.getComputedStyle(el).fontWeight;
  const num = Number.parseInt(weight, 10);
  el.style.fontWeight = weight === "bold" || num >= 600 ? "400" : "700";
  unwrapTitleInlineFormatting(el);
}

export function toggleTitleItalic(el: HTMLElement) {
  const style = el.style.fontStyle || window.getComputedStyle(el).fontStyle;
  el.style.fontStyle = style === "italic" ? "normal" : "italic";
  unwrapTitleInlineFormatting(el);
}

export function toggleTitleUnderline(el: HTMLElement) {
  const deco = el.style.textDecoration || window.getComputedStyle(el).textDecorationLine;
  el.style.textDecoration = deco.includes("underline") ? "none" : "underline";
  unwrapTitleInlineFormatting(el);
}

/** Title uses element-level styles; strip nested tags from legacy edits. */
function unwrapTitleInlineFormatting(el: HTMLElement) {
  const text = el.innerText.replace(/\u00a0/g, " ").trim();
  if (!text) {
    el.innerHTML = "";
    return;
  }
  if (el.querySelector("span,b,strong,i,em,u,font")) {
    el.textContent = text;
  }
}

export function insertHtmlAtSelection(html: string, editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);
  document.execCommand("insertHTML", false, html);
}

export function insertLinkAtSelection(url: string, label?: string, editor?: HTMLElement | null) {
  if (editor) prepareEditorCommand(editor);
  const range = getSelectionRange();
  const text = label?.trim() || range?.toString().trim() || url;
  insertHtmlAtSelection(
    `<a href="${url.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${text.replace(/</g, "&lt;")}</a>`,
    null,
  );
}

export function insertImageAtSelection(src: string, alt = "Announcement image", editor?: HTMLElement | null) {
  insertHtmlAtSelection(
    `<p><img src="${src.replace(/"/g, "&quot;")}" alt="${alt.replace(/"/g, "&quot;")}" style="width:100%;max-width:100%;height:auto;border-radius:0.375rem;display:block" /></p>`,
    editor,
  );
}

export function clearEditorFormatting(editor: HTMLElement | null) {
  if (!editor) return;
  const text = editor.innerText.replace(/\u00a0/g, " ").trim();
  editor.innerHTML = text ? `<p>${text.replace(/</g, "&lt;")}</p>` : "";
}

export function clearTitleFormatting(el: HTMLElement) {
  const text = el.innerText.replace(/\u00a0/g, " ").trim();
  el.innerHTML = text;
  el.removeAttribute("style");
}

export function initEditorParagraphMode(editor: HTMLElement | null) {
  if (!editor) return;
  try {
    document.execCommand("defaultParagraphSeparator", false, "p");
  } catch {
    /* unsupported in some browsers */
  }
}
