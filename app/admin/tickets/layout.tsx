import { PortalTicketsLayoutShell } from "@/components/portal/PortalTicketsLayoutShell";

export default function AdminTicketsLayout({ children }: { children: React.ReactNode }) {
  return <PortalTicketsLayoutShell>{children}</PortalTicketsLayoutShell>;
}
