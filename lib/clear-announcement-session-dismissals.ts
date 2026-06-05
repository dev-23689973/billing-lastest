/** Clears per-tab announcement dismiss flags (e.g. after logout so the next login can show the modal). */
export function clearAnnouncementSessionDismissals(): void {
  if (typeof sessionStorage === "undefined") return;
  const prefix = "billing-global-announcement-session:";
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
  }
}
