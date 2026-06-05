import type { StatusChevronBeltRow } from "@/components/ui/StatusChevronBelts";

export type MessageKpiBeltDetailLine = {
  label: string;
  value: string;
};

export type MessageKpiBeltRow = StatusChevronBeltRow & {
  /** Single-line summary in the collapsed row (details live in the dropdown). */
  headline: string;
  details: MessageKpiBeltDetailLine[];
};
