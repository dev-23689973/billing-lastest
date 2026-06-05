import { cn } from "@/lib/cn";
import { rsBadgeBase } from "@/lib/ui/responsiveScale";

/** Scroll shell modifier for denser Resellers / branches modal tables. */
export const ADMIN_LIST_MODAL_COMPACT_SCROLL_CLASS = "admin-list-modal-compact";

export const adminListModalPillClass = cn(
  rsBadgeBase,
  "admin-list-modal-pill px-1 py-px text-[9px] font-semibold leading-none sm:text-[10px]",
);
