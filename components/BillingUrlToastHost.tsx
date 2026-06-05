"use client";

import { Suspense, useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  invalidateAfterEndUserMutation,
  invalidateAfterStaffCreditsMutation,
  isStaffCreateWithCreditsSuccessOk,
} from "@/lib/client/invalidateAfterBillingMutation";
import {
  BILLING_URL_FLASH_STRIP,
  resolveBillingUrlFlashes,
} from "@/lib/billing/resolveBillingUrlFlashes";
import { flashToastKey, scheduleFlashToastItems } from "@/lib/client/scheduleFlashToast";
import { dispatchBillingHeaderStatsRefresh } from "@/lib/realtime/client-events";

function BillingUrlToastHostInner() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    const query = searchParams?.toString() ?? "";
    const items = resolveBillingUrlFlashes(pathname, new URLSearchParams(query));
    if (!items.length) return;

    const key = flashToastKey(pathname, query, items);
    scheduleFlashToastItems(key, items);

    const ok = searchParams?.get("ok") ?? "";
    if (ok === "credits_added" || ok === "credits_recovered") {
      dispatchBillingHeaderStatsRefresh();
    }
    if (isStaffCreateWithCreditsSuccessOk(ok, pathname)) {
      invalidateAfterStaffCreditsMutation();
    } else if (ok === "created") {
      invalidateAfterEndUserMutation();
    }

    const p = new URLSearchParams(query);
    let changed = false;
    for (const k of BILLING_URL_FLASH_STRIP) {
      if (p.has(k)) {
        p.delete(k);
        changed = true;
      }
    }
    if (!changed) return;

    const href = p.toString() ? `${pathname}?${p}` : pathname;
    const id = requestAnimationFrame(() => {
      router.replace(href, { scroll: false });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, router, searchParams]);

  return null;
}

/** Global URL → Sonner feedback (mounted once in root providers). */
export function BillingUrlToastHost() {
  return (
    <Suspense fallback={null}>
      <BillingUrlToastHostInner />
    </Suspense>
  );
}
