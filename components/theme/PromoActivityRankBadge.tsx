import { cn } from "@/lib/cn";
import {
  ACTIVITY_RANK_ICON,
  ACTIVITY_RANK_LABEL,
  ACTIVITY_RANK_SLOT_COUNT,
  sanitizeBadgeLitCount,
  type ActivityRank,
} from "@/lib/promoActivityBadge";

export function PromoActivityRankBadge({
  rank,
  litCount,
  className,
  title,
  ariaLabel,
  hoverStatusLine,
  hoverRemainLine,
}: {
  rank: ActivityRank | null;
  litCount?: number;
  className?: string;
  title?: string;
  ariaLabel: string;
  hoverStatusLine?: string;
  hoverRemainLine?: string | null;
}) {
  const displayRank = rank ?? "bronze";
  const icon = ACTIVITY_RANK_ICON[displayRank];
  const lit = rank != null ? sanitizeBadgeLitCount(litCount ?? 0) : 0;
  const showHoverTip = Boolean(hoverStatusLine);

  return (
    <span
      className={cn("promo-activity-rank inline-flex items-center", showHoverTip && "promo-activity-rank--hoverable", className)}
      title={showHoverTip ? undefined : title}
      aria-label={ariaLabel}
      tabIndex={showHoverTip ? 0 : undefined}
      role="img"
    >
      {Array.from({ length: ACTIVITY_RANK_SLOT_COUNT }, (_, index) => {
        const active = index < lit;
        return (
          <span
            key={index}
            className={cn(
              "promo-activity-rank__icon inline-flex items-center justify-center text-sm leading-none sm:text-base",
              active ? "promo-activity-rank__icon--active" : "promo-activity-rank__icon--disabled",
            )}
            aria-hidden
          >
            {icon}
          </span>
        );
      })}
      {showHoverTip ? (
        <span className="promo-activity-rank__tip" role="tooltip">
          <span className="promo-activity-rank__tipLine">{hoverStatusLine}</span>
          {hoverRemainLine ? (
            <span className="promo-activity-rank__tipLine promo-activity-rank__tipLine--remain">{hoverRemainLine}</span>
          ) : null}
        </span>
      ) : null}
      <span className="sr-only">
        {ariaLabel}
        {hoverRemainLine ? ` · ${hoverRemainLine}` : ""}
      </span>
    </span>
  );
}

export function adminActivityBadgeHoverLines(): { statusLine: string; remainLine: string | null } {
  return {
    statusLine: `${ACTIVITY_RANK_LABEL.diamond} ${ACTIVITY_RANK_SLOT_COUNT}/${ACTIVITY_RANK_SLOT_COUNT} · Admin`,
    remainLine: null,
  };
}
