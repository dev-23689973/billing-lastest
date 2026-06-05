import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { PORTAL_ADD_USER_NO_CREDITS_TITLE } from "@/lib/portal/portalAddUserMessages";

type Props = {
  href: string;
  canAdd: boolean;
};

/** PageHeader action on legacy operator subscriber pages. */
export function PortalAddSubscriberPageHeaderButton({ href, canAdd }: Props) {
  const baseClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition";

  if (!canAdd) {
    return (
      <span
        className={cn(
          baseClass,
          "pointer-events-none cursor-not-allowed bg-primary/40 text-primary-foreground/80 opacity-60",
        )}
        title={PORTAL_ADD_USER_NO_CREDITS_TITLE}
        aria-disabled="true"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add user
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(baseClass, "bg-primary text-primary-foreground hover:bg-primary/90")}
    >
      <Plus className="h-4 w-4" aria-hidden />
      Add user
    </Link>
  );
}
