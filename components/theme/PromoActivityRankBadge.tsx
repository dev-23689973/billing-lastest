import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  ACTIVITY_RANK_LABEL,
  ACTIVITY_RANK_SLOT_COUNT,
  sanitizeBadgeLitCount,
  type ActivityRank,
} from "@/lib/promoActivityBadge";
import {
  ACTIVITY_RANK_IMAGE,
  ADMIN_RANK_DISPLAY_HEIGHT_PX,
  ADMIN_RANK_DISPLAY_WIDTH_PX,
  ADMIN_RANK_IMAGE,
  ADMIN_RANK_IMAGE_2X,
  PROMO_RANK_SLOT_DISPLAY_PX,
} from "@/lib/promoActivityRankAssets";

function RankIcon({
  src,
  alt,
  active,
}: {
  src: string;
  alt: string;
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
        width={PROMO_RANK_SLOT_DISPLAY_PX}
        height={PROMO_RANK_SLOT_DISPLAY_PX}
        className="promo-activity-rank__img promo-activity-rank__img--slot h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
        draggable={false}
      />
    </span>
  );
}

function AdminRankIcon() {
  return (
    <span className="promo-activity-rank__icon promo-activity-rank__icon--active inline-flex shrink-0 items-center justify-center" aria-hidden>
      {/* Pre-rendered 3D crest with manual 1x/2x assets (see scripts/generate-admin-rank-icon.mjs). */}
      <img
        src={ADMIN_RANK_IMAGE}
        srcSet={`${ADMIN_RANK_IMAGE} 1x, ${ADMIN_RANK_IMAGE_2X} 2x`}
        alt="Admin"
        width={ADMIN_RANK_DISPLAY_WIDTH_PX}
        height={ADMIN_RANK_DISPLAY_HEIGHT_PX}
        className="promo-activity-rank__img promo-activity-rank__img--admin h-[1.375rem] w-[6.875rem] sm:h-[1.5625rem] sm:w-[7.8125rem]"
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
        data-slot-count={ACTIVITY_RANK_SLOT_COUNT}
        title={showHoverTip ? undefined : title}
        aria-label={ariaLabel}
        tabIndex={showHoverTip ? 0 : undefined}
        role="img"
      >
        <AdminRankIcon />
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
        return <RankIcon key={index} src={ACTIVITY_RANK_IMAGE[displayRank]} alt={rankLabel} active={active} />;
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
