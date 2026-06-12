import { cn } from "@/lib/cn";
import {
  ACTIVITY_RANK_ICON,
  ACTIVITY_RANK_LABEL,
  ACTIVITY_RANK_SLOT_COUNT,
  sanitizeBadgeLitCount,
  type ActivityRank,
} from "@/lib/promoActivityBadge";
import {
  PROMO_RANK_SLOT_DISPLAY_PX,
  VIP_RANK_IMAGE,
  VIP_RANK_IMAGE_2X,
} from "@/lib/promoActivityRankAssets";
function VipRankIcon({ alt, active }: { alt: string; active: boolean }) {
  return (
    <span
      className={cn(
        "promo-activity-rank__icon inline-flex shrink-0 items-center justify-center",
        active ? "promo-activity-rank__icon--active" : "promo-activity-rank__icon--disabled",
      )}
      aria-hidden
    >
      <img
        src={VIP_RANK_IMAGE}
        srcSet={`${VIP_RANK_IMAGE} 1x, ${VIP_RANK_IMAGE_2X} 2x`}
        alt={alt}
        width={PROMO_RANK_SLOT_DISPLAY_PX}
        height={PROMO_RANK_SLOT_DISPLAY_PX}
        className="promo-activity-rank__img promo-activity-rank__img--slot h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
        draggable={false}
        decoding="async"
      />
    </span>
  );
}

export function PromoActivityRankBadge({
  rank,
  litCount,
  variant = "progress",
  className,
  title,
  ariaLabel,
  hoverStatusLine,
  hoverRemainLine,
}: {
  rank: ActivityRank | null;
  litCount?: number;
  variant?: "progress" | "admin";
  className?: string;
  title?: string;
  ariaLabel: string;
  hoverStatusLine?: string;
  hoverRemainLine?: string | null;
}) {
  const displayRank = rank ?? "bronze";
  const emoji = ACTIVITY_RANK_ICON[displayRank];
  const lit = rank != null ? sanitizeBadgeLitCount(litCount ?? 0) : 0;
  const showHoverTip = Boolean(hoverStatusLine);
  const rankLabel = ACTIVITY_RANK_LABEL[displayRank];
  const useVipImage = displayRank === "vip";

  if (variant === "admin") {
    return (
      <span
        className={cn(
          "promo-activity-rank promo-activity-rank--admin inline-flex items-center gap-0",
          showHoverTip && "promo-activity-rank--hoverable",
          className,
        )}
        data-rank="admin"
        data-slot-count={ACTIVITY_RANK_SLOT_COUNT}
        title={showHoverTip ? undefined : title}
        aria-label={ariaLabel}
        tabIndex={showHoverTip ? 0 : undefined}
        role="img"
      >
        {Array.from({ length: ACTIVITY_RANK_SLOT_COUNT }, (_, index) => (
          <VipRankIcon key={index} alt="VIP" active />
        ))}
        {showHoverTip ? (
          <span className="promo-activity-rank__tip" role="tooltip">
            <span className="promo-activity-rank__tipLine">{hoverStatusLine}</span>
            {hoverRemainLine ? (
              <span className="promo-activity-rank__tipLine promo-activity-rank__tipLine--remain">{hoverRemainLine}</span>
            ) : null}
          </span>
        ) : null}
        <span className="sr-only">{ariaLabel}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "promo-activity-rank inline-flex items-center gap-0",
        showHoverTip && "promo-activity-rank--hoverable",
        className,
      )}
      data-rank={displayRank}
      title={showHoverTip ? undefined : title}
      aria-label={ariaLabel}
      tabIndex={showHoverTip ? 0 : undefined}
      role="img"
    >
      {Array.from({ length: ACTIVITY_RANK_SLOT_COUNT }, (_, index) => {
        const active = index < lit;
        if (useVipImage) {
          return <VipRankIcon key={index} alt={rankLabel} active={active} />;
        }
        return (
          <span
            key={index}
            className={cn(
              "promo-activity-rank__icon inline-flex items-center justify-center text-sm leading-none sm:text-base",
              active ? "promo-activity-rank__icon--active" : "promo-activity-rank__icon--disabled",
            )}
            aria-hidden
          >
            {emoji}
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
    statusLine: "Admin · Top level · Unlimited",
    remainLine: null,
  };
}
