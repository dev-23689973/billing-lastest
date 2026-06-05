export type ComboDropdownViewport = {
  height: number;
  offsetTop: number;
};

export type ComboDropdownPanelPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  /** `absolute` when the panel is portaled inside a `showModal()` dialog (top layer). */
  coordinateMode?: "fixed" | "absolute";
};

export type ComboDropdownPanelOpts = {
  gap?: number;
  minHeight?: number;
  preferredMaxHeight?: number;
  margin?: number;
};

/** Visible viewport (shrinks when the mobile soft keyboard is open). */
export function getComboDropdownViewport(): ComboDropdownViewport {
  if (typeof window === "undefined") {
    return { height: 0, offsetTop: 0 };
  }
  const vv = window.visualViewport;
  if (vv) {
    return { height: vv.height, offsetTop: vv.offsetTop };
  }
  return { height: window.innerHeight, offsetTop: 0 };
}

/** Desktop comboboxes may focus the filter field; touch/narrow viewports should not (avoids covering the panel). */
export function shouldAutoFocusComboSearch(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  if (window.matchMedia("(hover: none)").matches) return false;
  if (window.matchMedia("(max-width: 639px)").matches) return false;
  return true;
}

export function computeComboDropdownPanelPos(
  triggerRect: { top: number; bottom: number; left: number; width: number },
  viewport: ComboDropdownViewport,
  opts?: ComboDropdownPanelOpts,
): ComboDropdownPanelPos {
  const gap = opts?.gap ?? 4;
  const minHeight = opts?.minHeight ?? 160;
  const preferredMax = opts?.preferredMaxHeight ?? 288;
  const margin = opts?.margin ?? 12;

  const visibleTop = viewport.offsetTop;
  const visibleBottom = viewport.offsetTop + viewport.height;

  const spaceBelow = visibleBottom - triggerRect.bottom - gap - margin;
  const spaceAbove = triggerRect.top - visibleTop - gap - margin;

  const openBelow = spaceBelow >= minHeight || spaceBelow >= spaceAbove;
  const available = Math.max(0, openBelow ? spaceBelow : spaceAbove);
  const maxHeight = Math.max(minHeight, Math.min(preferredMax, available || preferredMax));

  const top = openBelow
    ? triggerRect.bottom + gap
    : Math.max(visibleTop + margin, triggerRect.top - gap - maxHeight);

  return {
    top,
    left: triggerRect.left,
    width: triggerRect.width,
    maxHeight,
  };
}

export function computeComboDropdownPanelPosFromTrigger(
  trigger: HTMLElement,
  opts?: ComboDropdownPanelOpts,
): ComboDropdownPanelPos {
  const r = trigger.getBoundingClientRect();
  return {
    ...computeComboDropdownPanelPos(
      { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
      getComboDropdownViewport(),
      opts,
    ),
    coordinateMode: "fixed",
  };
}

/**
 * Panel coords relative to a modal container (must portal into the same element).
 * Height uses the visible viewport so the list is not capped by the modal footer;
 * only `top` / `left` are container-relative (stays in the `showModal()` top layer).
 */
export function computeComboDropdownPanelPosInContainer(
  trigger: HTMLElement,
  container: HTMLElement,
  opts?: ComboDropdownPanelOpts,
): ComboDropdownPanelPos {
  const gap = opts?.gap ?? 4;
  const margin = opts?.margin ?? 12;
  const minHeight = opts?.minHeight ?? 200;
  const preferredMax = opts?.preferredMaxHeight ?? 360;

  const tr = trigger.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  const viewport = getComboDropdownViewport();

  const visibleTop = viewport.offsetTop;
  const visibleBottom = viewport.offsetTop + viewport.height;
  const spaceBelow = visibleBottom - tr.bottom - gap - margin;
  const spaceAbove = tr.top - visibleTop - gap - margin;
  const openBelow = spaceBelow >= minHeight || spaceBelow >= spaceAbove;
  const available = Math.max(0, openBelow ? spaceBelow : spaceAbove);
  const maxHeight = Math.max(minHeight, Math.min(preferredMax, available || preferredMax));

  const top = openBelow
    ? tr.bottom - cr.top + gap
    : Math.max(margin, tr.top - cr.top - gap - maxHeight);

  return {
    top,
    left: tr.left - cr.left,
    width: tr.width,
    maxHeight,
    coordinateMode: "absolute",
  };
}
