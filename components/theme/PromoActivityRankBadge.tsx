import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  ACTIVITY_RANK_LABEL,
  ACTIVITY_RANK_SLOT_COUNT,
  sanitizeBadgeLitCount,
  type ActivityRank,
} from "@/lib/promoActivityBadge";
import { ACTIVITY_RANK_IMAGE, ADMIN_RANK_IMAGE } from "@/lib/promoActivityRankAssets";

const RANK_ICON_SIZE = 20;
const ADMIN_ICON_SIZE = 24;

function RankIcon({
  src,
  alt,
  size,
  active,
}: {
  src: string;
  alt: string;
  size: number;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "promo-activity-rank__icon inline-flex shrink-0 items-center justify-center",
        active ? "promo-activity-rank__icon--active" : "promo-activity-rank__icon--disabled",
      )}
      aria-hidden
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="promo-activity-rank__img h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
        draggable={false}
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
  const lit = rank != null ? sanitizeBadgeLitCount(litCount ?? 0) : 0;
  const showHoverTip = Boolean(hoverStatusLine);
  const rankLabel = ACTIVITY_RANK_LABEL[displayRank];

  if (variant === "admin") {
    return (
      <span
        className={cn(
          "promo-activity-rank promo-activity-rank--admin inline-flex items-center",
          showHoverTip && "promo-activity-rank--hoverable",
          className,
        )}
        data-rank="admin"
        title={showHoverTip ? undefined : title}
        aria-label={ariaLabel}
        tabIndex={showHoverTip ? 0 : undefined}
        role="img"
      >
        <RankIcon src={ADMIN_RANK_IMAGE} alt="Admin" size={ADMIN_ICON_SIZE} active />
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
      className={cn("promo-activity-rank inline-flex items-center", showHoverTip && "promo-activity-rank--hoverable", className)}
      data-rank={displayRank}
      title={showHoverTip ? undefined : title}
      aria-label={ariaLabel}
      tabIndex={showHoverTip ? 0 : undefined}
      role="img"
    >
      {Array.from({ length: ACTIVITY_RANK_SLOT_COUNT }, (_, index) => {
        const active = index < lit;
        return (
          <RankIcon
            key={index}
            src={ACTIVITY_RANK_IMAGE[displayRank]}
            alt={rankLabel}
            size={RANK_ICON_SIZE}
            active={active}
          />
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
    statusLine: "Admin",
    remainLine: null,
  };
}
