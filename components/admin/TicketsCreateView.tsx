import Link from "next/link";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { portalTicketCreateFlashItems } from "@/lib/urlFlashToasts";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel } from "@/components/admin/Panel";
import { CreateTicketForm } from "@/components/admin/CreateTicketForm";
import { listTvGenres } from "@/lib/repos/tickets";
import { buttonOutlineLinkClassName } from "@/components/ui/button";

type CreateAction = (formData: FormData) => void | Promise<void>;

export async function TicketsCreateView({
  portalBase,
  createAction,
  flash,
}: {
  portalBase?: "/admin" | "/manager" | "/reseller" | "/dealer";
  createAction: CreateAction;
  flash: { error?: string };
}) {
  const base = portalBase ?? "/admin";
  const genres = await listTvGenres();
  const createTicketFlashes = portalTicketCreateFlashItems(flash);
  const ticketsListHref = `${base}/tickets`;
  const breadcrumbLabel = base === "/manager" ? "Home › Tickets" : base === "/admin" ? "Home › Tickets" : "Portal › Tickets";

  return (
    <div className="space-y-6 pb-10">
      <FlashToastsBoundary items={createTicketFlashes} stripParams={["error"]} />
      <PageHeader
        title="Create ticket"
        breadcrumb={
          <span className="text-muted-foreground">
            <Link href={ticketsListHref} className="text-muted-foreground transition-colors hover:text-foreground">
              {breadcrumbLabel}
            </Link>{" "}
            › Create
          </span>
        }
        actions={
          <Link href={ticketsListHref} className={buttonOutlineLinkClassName("bg-card shadow-sm")}>
            Back to tickets
          </Link>
        }
      />
      <Panel
        title="Create New Ticket"
        className="overflow-hidden rounded-2xl border-border/70 shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
      >
        {genres.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No channel categories are available. Contact your administrator to configure the TV platform.
          </p>
        ) : (
          <CreateTicketForm genres={genres} action={createAction} />
        )}
      </Panel>
    </div>
  );
}
