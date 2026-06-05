import { formatRenewExpiryDateShort } from "@/lib/renewModalDisplay";
import { validityOptionChargedCredits, type ValidityOption } from "@/lib/validityOptions";

function renewPeriodMonths(option: ValidityOption): number {
  const months = Number.parseInt(option.value, 10);
  return Number.isFinite(months) && months > 0 ? months : 0;
}

export type SubscriberRenewRecoverSuccessMode = "renew" | "recover";

export type SubscriberRenewRecoverSuccessDetails = {
  mode: SubscriberRenewRecoverSuccessMode;
  account: string;
  displayName?: string;
  debitUsername?: string | null;
  walletBefore: number;
  walletAfter: number;
  chargedCredits?: number;
  promoBonusMonths?: number;
  periodMonths?: number;
  periodLabel?: string;
  creditMonthsRecovered?: number;
  bonusMonthsRecovered?: number;
  expiryBeforeLabel?: string | null;
  expiryAfterLabel?: string | null;
};

export function buildSubscriberRenewSuccessDetails(input: {
  account: string;
  displayName?: string;
  debitUsername?: string | null;
  walletBefore: number;
  selectedOption: ValidityOption;
  expiryBefore: Date | null;
  expiryAfter: Date | null;
}): SubscriberRenewRecoverSuccessDetails {
  const charged = validityOptionChargedCredits(input.selectedOption);
  const months = renewPeriodMonths(input.selectedOption);
  const promoBonus = months > charged ? months - charged : 0;

  return {
    mode: "renew",
    account: input.account,
    displayName: input.displayName,
    debitUsername: input.debitUsername,
    walletBefore: input.walletBefore,
    walletAfter: Math.max(0, input.walletBefore - charged),
    chargedCredits: charged,
    promoBonusMonths: promoBonus > 0 ? promoBonus : undefined,
    periodMonths: months > 0 ? months : undefined,
    periodLabel: input.selectedOption.label,
    expiryBeforeLabel: formatRenewExpiryDateShort(input.expiryBefore),
    expiryAfterLabel: formatRenewExpiryDateShort(input.expiryAfter),
  };
}

export function buildSubscriberRecoverSuccessDetails(input: {
  account: string;
  displayName?: string;
  debitUsername?: string | null;
  walletBefore: number;
  creditMonths: number;
  bonusMonths: number;
  expiryBefore: Date | null;
  expiryAfter: Date | null;
}): SubscriberRenewRecoverSuccessDetails {
  const credit = Math.max(0, input.creditMonths);
  const bonus = Math.max(0, input.bonusMonths);

  return {
    mode: "recover",
    account: input.account,
    displayName: input.displayName,
    debitUsername: input.debitUsername,
    walletBefore: input.walletBefore,
    walletAfter: input.walletBefore + credit,
    creditMonthsRecovered: credit > 0 ? credit : undefined,
    bonusMonthsRecovered: bonus > 0 ? bonus : undefined,
    chargedCredits: credit,
    expiryBeforeLabel: formatRenewExpiryDateShort(input.expiryBefore),
    expiryAfterLabel: formatRenewExpiryDateShort(input.expiryAfter),
  };
}
