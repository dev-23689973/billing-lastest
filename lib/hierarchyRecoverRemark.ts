export type ParsedHierarchyRecoverRemark = {
  /** Full credits removed from the child wallet (principal + promo void). */
  walletDebit: number;
  /** Principal refunded to the parent wallet. */
  payerRefund: number;
  /** Promo destroyed on recover (not refunded). */
  bonusVoid: number;
};

function parsePositiveInt(raw: string): number | null {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Parses hierarchy recover remark text written by `hierarchyRecoverRemarkParts` and legacy recover lines. */
export function parseHierarchyRecoverRemark(
  remarks: string | null | undefined,
): ParsedHierarchyRecoverRemark | null {
  if (remarks == null || String(remarks).trim() === "") return null;
  const rm = String(remarks).trim();
  if (!/\bcredits\s+recovered\b/i.test(rm)) return null;

  let m = rm.match(/^(\d+)\s+credits\s+recovered\s+\((\d+)\s+refunded,\s*(\d+)\s+promo\s+void\)/i);
  if (m) {
    const walletDebit = parsePositiveInt(m[1]);
    const payerRefund = parsePositiveInt(m[2]);
    const bonusVoid = parsePositiveInt(m[3]);
    if (walletDebit != null && payerRefund != null && bonusVoid != null) {
      return { walletDebit, payerRefund, bonusVoid };
    }
  }

  m = rm.match(/^(\d+)\s+credits\s+recovered\s+\(promo\s+void\)/i);
  if (m) {
    const walletDebit = parsePositiveInt(m[1]);
    if (walletDebit != null) {
      return { walletDebit, payerRefund: 0, bonusVoid: walletDebit };
    }
  }

  m = rm.match(/^(\d+)\s+credits\s+recovered\s+\((\d+)\s+base\)/i);
  if (m) {
    const walletDebit = parsePositiveInt(m[1]);
    const payerRefund = parsePositiveInt(m[2]);
    if (walletDebit != null && payerRefund != null) {
      return { walletDebit, payerRefund, bonusVoid: Math.max(0, walletDebit - payerRefund) };
    }
  }

  m = rm.match(/^(\d+)\s+credits\s+recovered\b/i);
  if (m) {
    const walletDebit = parsePositiveInt(m[1]);
    if (walletDebit != null) {
      return { walletDebit, payerRefund: walletDebit, bonusVoid: 0 };
    }
  }

  return null;
}
