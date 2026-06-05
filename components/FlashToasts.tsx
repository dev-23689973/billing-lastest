"use client";

import { Suspense, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { invalidateAfterEndUserMutation } from "@/lib/client/invalidateAfterBillingMutation";
import { flashToastKey, scheduleFlashToastItems } from "@/lib/client/scheduleFlashToast";
import { dispatchBillingHeaderStatsRefresh } from "@/lib/realtime/client-events";

export type FlashToastItem = {
  type: "success" | "error" | "info" | "warning";
  message: string;
  description?: string;
};

function FlashToastsInner({
  items,
  stripParams = ["ok", "error"],
}: {
  items: FlashToastItem[];
  stripParams?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const handledKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!items.length) return;

    const query = searchParams?.toString() ?? "";
    const key = flashToastKey(pathname, query, items);
    if (handledKey.current === key) return;
    handledKey.current = key;

    scheduleFlashToastItems(key, items);

    const ok = searchParams?.get("ok") ?? "";
    if (ok === "credits_added" || ok === "credits_recovered") {
      dispatchBillingHeaderStatsRefresh();
    }
    if (ok === "created") {
      invalidateAfterEndUserMutation();
    }

    const p = new URLSearchParams(query);
    let changed = false;
    for (const k of stripParams) {
      if (p.has(k)) {
        p.delete(k);
        changed = true;
      }
    }
    if (changed) {
      const href = p.toString() ? `${pathname}?${p}` : pathname;
      const id = requestAnimationFrame(() => {
        router.replace(href, { scroll: false });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [items, pathname, router, searchParams, stripParams]);

  return null;
}

/** Page-level flash hook (deduped with global BillingUrlToastHost). */
export function FlashToastsBoundary(props: { items: FlashToastItem[]; stripParams?: string[] }) {
  return (
    <Suspense fallback={null}>
      <FlashToastsInner {...props} />
    </Suspense>
  );
}
