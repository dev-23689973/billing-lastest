import type { SubscriberRenewRecoverSuccessDetails } from "@/lib/subscriberRenewRecoverSuccess";
import {
  clampValiditySelection,
  isCreateOnlyValidityValue,
  validityOptionChargedCredits,
  type ValidityOption,
} from "@/lib/validityOptions";

export type BulkRenewWalletGroup = {
  debitUsername: string;
  debitCredits: number;
  accountCount: number;
};

export type BulkRenewAvailabilitySnapshot = {
  wallets: BulkRenewWalletGroup[];
  resolvedCount: number;
  accountCount: number;
  unresolvedCount: number;
  accountWalletMap: Record<string, string>;
};

export type BulkRenewAccountAvailabilityRow = {
  account: string;
  ok: boolean;
  debitUsername?: string | null;
  debitCredits?: number | null;
};

export function aggregateBulkRenewAvailability(
  accountCount: number,
  rows: BulkRenewAccountAvailabilityRow[],
): BulkRenewAvailabilitySnapshot {
  const walletMap = new Map<string, { debitCredits: number; accountCount: number }>();
  const accountWalletMap: Record<string, string> = {};
  let resolvedCount = 0;

  for (const row of rows) {
    if (!row.ok) continue;
    resolvedCount += 1;
    const wallet = String(row.debitUsername ?? "").trim() || "—";
    const credits =
      typeof row.debitCredits === "number" && Number.isFinite(row.debitCredits)
        ? Math.max(0, Math.floor(row.debitCredits))
        : 0;
    accountWalletMap[row.account] = wallet;
    const cur = walletMap.get(wallet);
    if (cur) {
      cur.accountCount += 1;
      cur.debitCredits = Math.max(cur.debitCredits, credits);
    } else {
      walletMap.set(wallet, { debitCredits: credits, accountCount: 1 });
    }
  }

  const wallets = [...walletMap.entries()]
    .map(([debitUsername, data]) => ({
      debitUsername,
      debitCredits: data.debitCredits,
      accountCount: data.accountCount,
    }))
    .sort((a, b) => a.debitUsername.localeCompare(b.debitUsername));

  return {
    wallets,
    resolvedCount,
    accountCount,
    unresolvedCount: Math.max(0, accountCount - resolvedCount),
    accountWalletMap,
  };
}

export function chargedPerAccountForValidity(
  validity: string,
  selectedOption: ValidityOption | undefined,
): number {
  if (validity === "FREE_TRIAL" || validity === "1_MONTH_FREE") return 0;
  if (selectedOption) return validityOptionChargedCredits(selectedOption);
  const months = Number.parseInt(validity, 10);
  return Number.isFinite(months) && months > 0 ? months : 0;
}

/** Best-off dealer: highest credits ÷ selected account count across wallets. */
export function bestOffWalletAverageCredits(wallets: BulkRenewWalletGroup[]): number {
  let best = 0;
  for (const wallet of wallets) {
    if (wallet.accountCount < 1) continue;
    const avg = wallet.debitCredits / wallet.accountCount;
    if (avg > best) best = avg;
  }
  return best;
}

/** Period list capped by the best-off dealer average (charged credits per account). */
export function filterBulkRenewValidityOptions(
  options: ValidityOption[],
  wallets: BulkRenewWalletGroup[],
): ValidityOption[] {
  if (wallets.length === 0) return [];
  const bestOffAvg = bestOffWalletAverageCredits(wallets);
  return options.filter((option) => {
    if (isCreateOnlyValidityValue(option.value)) return false;
    const charged = validityOptionChargedCredits(option);
    if (!Number.isFinite(charged) || charged < 1) return false;
    return charged <= bestOffAvg;
  });
}

/** All selected accounts under this wallet renew, or the whole wallet is skipped. */
export function walletAffordableForBulkOption(wallet: BulkRenewWalletGroup, option: ValidityOption): boolean {
  if (isCreateOnlyValidityValue(option.value)) return false;
  const charged = validityOptionChargedCredits(option);
  if (!Number.isFinite(charged) || charged < 1) return false;
  return wallet.debitCredits >= charged * wallet.accountCount;
}

export function anyWalletAffordableForBulkOption(
  wallets: BulkRenewWalletGroup[],
  option: ValidityOption,
): boolean {
  return wallets.some((wallet) => walletAffordableForBulkOption(wallet, option));
}

export function walletsRenewingAtPeriod(
  wallets: BulkRenewWalletGroup[],
  option: ValidityOption,
): BulkRenewWalletGroup[] {
  return wallets.filter((wallet) => walletAffordableForBulkOption(wallet, option));
}

export function bulkRenewWalletAfterBalance(wallet: BulkRenewWalletGroup, chargedPerAccount: number): number {
  const totalCharge = Math.max(0, chargedPerAccount) * Math.max(0, wallet.accountCount);
  return Math.max(0, wallet.debitCredits - totalCharge);
}

export function countBulkRenewSuccessesPerWallet(
  successAccounts: string[],
  accountWalletMap: Record<string, string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const account of successAccounts) {
    const wallet = accountWalletMap[account] ?? "—";
    counts.set(wallet, (counts.get(wallet) ?? 0) + 1);
  }
  return counts;
}

export function buildBulkRenewSuccessDetails(input: {
  selectedOption: ValidityOption;
  wallets: BulkRenewWalletGroup[];
  successAccounts: string[];
  accountWalletMap: Record<string, string>;
}): SubscriberRenewRecoverSuccessDetails {
  const charged = validityOptionChargedCredits(input.selectedOption);
  const months = Number.parseInt(input.selectedOption.value, 10);
  const promoBonus = Number.isFinite(months) && months > charged ? months - charged : 0;
  const successCount = input.successAccounts.length;
  const perWalletSuccess = countBulkRenewSuccessesPerWallet(input.successAccounts, input.accountWalletMap);

  const bulkWalletRows = input.wallets
    .map((wallet) => {
      const renewed = perWalletSuccess.get(wallet.debitUsername) ?? 0;
      if (renewed <= 0) return null;
      const debit = charged * renewed;
      return {
        debitUsername: wallet.debitUsername,
        walletBefore: wallet.debitCredits,
        walletAfter: Math.max(0, wallet.debitCredits - debit),
        accountCount: renewed,
        chargedTotal: debit,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const primary = bulkWalletRows[0];
  const totalDebited = bulkWalletRows.reduce((sum, row) => sum + row.chargedTotal, 0);

  return {
    mode: "renew",
    account: successCount === 1 ? input.successAccounts[0]! : `${successCount} accounts`,
    displayName: successCount === 1 ? undefined : `${successCount} accounts renewed`,
    debitUsername: primary?.debitUsername ?? input.wallets[0]?.debitUsername ?? null,
    walletBefore: primary?.walletBefore ?? 0,
    walletAfter: primary?.walletAfter ?? 0,
    chargedCredits: charged,
    periodLabel: input.selectedOption.label,
    promoBonusMonths: promoBonus > 0 ? promoBonus : undefined,
    bulkWalletRows,
    bulkTotalDebited: totalDebited,
  };
}

export { clampValiditySelection };
