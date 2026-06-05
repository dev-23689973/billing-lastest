import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import { managersToolbarPrimaryButtonClass } from "@/components/admin/managers-toolbar-icon-button";
import { PORTAL_ADD_USER_NO_CREDITS_TITLE } from "@/lib/portal/portalAddUserMessages";

type Props = {
  href: string;
  canAdd: boolean;
  /** When set, prevent navigation and call this instead (list modal). */
  onModalOpen?: () => void;
  className?: string;
};

/** Primary toolbar control for portal subscriber lists — disabled at 0 credits. */
export function PortalAddSubscriberToolbarButton({ href, canAdd, onModalOpen, className }: Props) {
  const label = (
    <>
      <UserRoundPlus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span>Add user</span>
    </>
  );

  if (!canAdd) {
    return (
      <span
        className={cn(
          managersToolbarPrimaryButtonClass,
          "pointer-events-none cursor-not-allowed opacity-50",
          className,
        )}
        title={PORTAL_ADD_USER_NO_CREDITS_TITLE}
        aria-disabled="true"
      >
        {label}
      </span>
    );
  }

  if (onModalOpen) {
    return (
      <Link
        href={href}
        className={cn(managersToolbarPrimaryButtonClass, className)}
        title="Add user"
        onClick={(e) => {
          e.preventDefault();
          onModalOpen();
        }}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link href={href} className={cn(managersToolbarPrimaryButtonClass, className)} title="Add user">
      {label}
    </Link>
  );
}
