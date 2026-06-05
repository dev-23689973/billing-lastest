/** Preserve contenteditable selection while the toolbar is used. */

const savedRanges = new WeakMap<HTMLElement, Range>();

export function captureEditorSelection(editor: HTMLElement | null): void {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed && savedRanges.has(editor)) return;
  savedRanges.set(editor, range.cloneRange());
}

/** Call from toolbar pointer down (capture) before focus moves away from the editor. */
export function pinEditorSelection(editor: HTMLElement | null): void {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (!range.collapsed) {
    savedRanges.set(editor, range.cloneRange());
  }
}

export function restoreEditorSelection(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const saved = savedRanges.get(editor);
  if (!saved) return false;

  try {
    editor.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(saved);
    return true;
  } catch {
    savedRanges.delete(editor);
    return false;
  }
}

/** Re-show a saved or full-element selection after formatting. */
export function reselectElementContents(el: HTMLElement | null): void {
  if (!el) return;
  const saved = savedRanges.get(el);
  const sel = window.getSelection();
  if (!sel) return;

  try {
    el.focus({ preventScroll: true });
    sel.removeAllRanges();
    if (saved && !saved.collapsed) {
      sel.addRange(saved);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.addRange(range);
    savedRanges.set(el, range.cloneRange());
  } catch {
    /* ignore invalid ranges */
  }
}

export function clearEditorSelection(editor: HTMLElement | null): void {
  if (editor) savedRanges.delete(editor);
}

export function prepareEditorCommand(editor: HTMLElement | null): void {
  editor?.focus({ preventScroll: true });
  restoreEditorSelection(editor);
}

export function hasPinnedEditorSelection(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const saved = savedRanges.get(editor);
  return Boolean(saved && !saved.collapsed);
}
