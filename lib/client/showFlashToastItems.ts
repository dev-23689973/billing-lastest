import { toast } from "sonner";
import type { FlashToastItem } from "@/components/FlashToasts";

/** Fire Sonner toasts for server-built flash items (URL redirect feedback). */
export function showFlashToastItems(items: FlashToastItem[]) {
  for (const it of items) {
    const opts = it.description ? { description: it.description } : undefined;
    if (it.type === "success") toast.success(it.message, opts);
    else if (it.type === "error") toast.error(it.message, opts);
    else if (it.type === "warning") toast.warning(it.message, opts);
    else toast.message(it.message, opts);
  }
}
