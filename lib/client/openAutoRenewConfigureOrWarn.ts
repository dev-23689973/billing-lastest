import { toast } from "sonner";
import { getAutoRenewEnableBlockMessage } from "@/lib/accountAutoRenew";

export function openAutoRenewConfigureOrWarn(input: {
  subscriptionExpired: boolean;
  accountActive: boolean;
  onOpen: () => void;
}): void {
  const message = getAutoRenewEnableBlockMessage(input);
  if (message) {
    toast.warning(message);
    return;
  }
  input.onOpen();
}
