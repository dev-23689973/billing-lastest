import { toast } from "sonner";

/** Default billing toast stack (root `AppToaster`). */
export const billingToast = toast;

/** Toasts rendered inside an open native `<dialog>` (`DialogLayerToaster`). */
export const dialogToast = {
  success: (message: string, data?: Parameters<typeof toast.success>[1]) =>
    toast.success(message, { ...data, toasterId: "dialog" }),
  error: (message: string, data?: Parameters<typeof toast.error>[1]) =>
    toast.error(message, { ...data, toasterId: "dialog" }),
  warning: (message: string, data?: Parameters<typeof toast.warning>[1]) =>
    toast.warning(message, { ...data, toasterId: "dialog" }),
  info: (message: string, data?: Parameters<typeof toast.info>[1]) =>
    toast.info(message, { ...data, toasterId: "dialog" }),
  message: (message: string, data?: Parameters<typeof toast.message>[1]) =>
    toast.message(message, { ...data, toasterId: "dialog" }),
};

/** Run after closing a modal so the global stack is not covered by overlay / top layer. */
export function toastAfterModalClose(onClose: () => void, show: () => void) {
  onClose();
  requestAnimationFrame(() => show());
}
