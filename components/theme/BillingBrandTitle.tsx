import { cn } from "@/lib/cn";

type BillingBrandTitleProps = {
  children: React.ReactNode;
  /** `sidebar` matches AdminSidebar; `hero` / `card` for login breakpoints. */
  size?: "sidebar" | "hero" | "card";
  className?: string;
  title?: string;
  as?: "h1" | "p" | "span";
};

/** Metallic chrome panel title — shared across sidebar, login, and loaders. */
export function BillingBrandTitle({
  children,
  size = "sidebar",
  className,
  title,
  as: Tag = "h1",
}: BillingBrandTitleProps) {
  return (
    <Tag
      className={cn(
        "billing-brand-title",
        size === "sidebar" && "billing-brand-title--sidebar sidebar-brand-title break-words whitespace-normal",
        size === "hero" && "billing-brand-title--hero",
        size === "card" && "billing-brand-title--card break-words whitespace-normal",
        className,
      )}
      title={title}
    >
      {children}
    </Tag>
  );
}
