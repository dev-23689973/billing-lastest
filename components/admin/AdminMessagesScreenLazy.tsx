"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AdminMessagesScreen } from "@/components/admin/AdminMessagesScreen";

const AdminMessagesScreenDynamic = dynamic(
  () => import("@/components/admin/AdminMessagesScreen").then((m) => m.AdminMessagesScreen),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[16rem] flex-1 items-center justify-center text-sm text-muted-foreground"
        aria-busy
        aria-label="Loading messages"
      >
        Loading messages…
      </div>
    ),
  },
);

type Props = ComponentProps<typeof AdminMessagesScreen>;

export function AdminMessagesScreenLazy(props: Props) {
  return <AdminMessagesScreenDynamic {...props} />;
}
