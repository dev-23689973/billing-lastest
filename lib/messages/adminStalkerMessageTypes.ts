/** Client-safe types + empty defaults (no DB / session imports). */

export type AdminStalkerMessageDashboardStats = {
  sendsToday: number;
  recipients30d: number;
  deliveryPct: number | null;
  deliveryPending: boolean;
  delivered: number;
  pendingHigh: number;
  pendingNormal: number;
  pendingLow: number;
  pendingOther: number;
};

export type AdminRecentStalkerSendMessageRow = {
  uid: number;
  login: string | null;
  title: string | null;
  msg: string | null;
  priority: number | null;
  addtime: string | null;
  need_confirm: number | null;
};

export function emptyAdminStalkerMessageDashboardStats(): AdminStalkerMessageDashboardStats {
  return {
    sendsToday: 0,
    recipients30d: 0,
    deliveryPct: null,
    deliveryPending: false,
    delivered: 0,
    pendingHigh: 0,
    pendingNormal: 0,
    pendingLow: 0,
    pendingOther: 0,
  };
}
