/** Admin + portal subscriber list GET filters (status query param). */
export const SUBSCRIBER_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All status" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
];

export const PAGE_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];
