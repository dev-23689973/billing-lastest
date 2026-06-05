import { BillingBrandTitle } from "@/components/theme/BillingBrandTitle";
import { BillingLinkLoader } from "@/components/ui/BillingLinkLoader";
import { cn } from "@/lib/cn";

type Props = {
  panelTitle?: string;
  message?: string;
  className?: string;
};

/** Full-viewport route loading — CSS link chain only (no WebGL). */
export function BillingLoadingScreen({
  panelTitle,
  message = "Loading workspace",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "billing-route-backdrop fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        {panelTitle ? (
          <BillingBrandTitle
            size="card"
            as="p"
            className="max-w-[16rem]"
            title={panelTitle}
          >
            {panelTitle}
          </BillingBrandTitle>
        ) : null}
        <BillingLinkLoader label={message} size="lg" />
      </div>
    </div>
  );
}
