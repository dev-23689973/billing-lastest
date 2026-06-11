import { Crown } from "lucide-react";
import { cn } from "@/lib/cn";
import { ACTIVITY_RANK_SLOT_COUNT } from "@/lib/promoActivityBadge";

export function AdminRankStrip({ className }: { className?: string }) {
  return (
    <span className={cn("admin-rank-strip", className)} aria-hidden>
      <span className="admin-rank-strip__grid">
        {Array.from({ length: ACTIVITY_RANK_SLOT_COUNT }, (_, index) => (
          <span key={index} className="admin-rank-strip__cell" />
        ))}
      </span>
      <span className="admin-rank-strip__mark">
        <Crown className="admin-rank-strip__crown" strokeWidth={2.25} aria-hidden />
        <span className="admin-rank-strip__infinity">∞</span>
      </span>
      <span className="admin-rank-strip__shine" aria-hidden />
    </span>
  );
}
