import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  breadcrumb?: ReactNode;
  /** When true, shows a prominent BACK link (sidebar makes this optional on list pages). */
  showBack?: boolean;
  /** Target for BACK (admin default: dashboard; portals should pass e.g. `/manager`). */
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

/** Page title row (temp-figma-style hierarchy + mobile-friendly actions). */
export function PageHeader({
  title,
  breadcrumb,
  showBack = false,
  backHref = "/admin/dashboard",
  backLabel = "BACK",
  actions,
  className,
}: Props) {
  const hasControls = Boolean(actions) || showBack;
  return (
    <>
      <h1 className="sr-only">{title}</h1>
      {breadcrumb ? <div className="sr-only">{breadcrumb}</div> : null}
    </>
  );
}
