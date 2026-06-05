import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getDeductionsConfig,
  getScopedExpiringSoonCount,
  getUsersSummaryScoped,
  listAccountsPagedScoped,
  listResellersOwnedByManager,
  listStalkerTariffPlans,
} from "@/lib/data";
import { buildValidityOptionsFromDeductionRows } from "@/lib/validityOptions";
import { getStalkerCustomPackagePlanId, listStalkerPackagesForPlan } from "@/lib/repos/stalkerUserPackages";
import { operatorCopy } from "@/lib/operatorUiCopy";
import type { FlashToastItem } from "@/components/FlashToasts";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { PageHeader } from "@/components/admin/PageHeader";
import { UsersStatusKpiPopupLauncher } from "@/components/admin/UsersStatusKpiPopupLauncher";
import { AdminSubscribersTableLazy } from "@/components/admin/AdminSubscribersTableLazy";
import {
  portalUsersDeleteListErrorMessage,
  portalUsersRenewListErrorMessage,
  portalUsersResetListErrorMessage,
  portalUsersStatusQuickErrorMessage,
} from "@/lib/portalUsersRenewListMessages";
import { newEndUserCreationFlashItems } from "@/lib/urlFlashToasts";
import { PAGE_SIZE_OPTIONS, SUBSCRIBER_STATUS_FILTER_OPTIONS } from "@/lib/subscriberFilterSelectOptions";
import { buildManagersStaffPaginationItems, managersStaffPageBtnBaseClass } from "@/lib/adminManagersStaffPagination";
import { StaffListTableFooterBar } from "@/components/admin/StaffListTableFooterBar";
import { MANAGER_SUBSCRIBERS_PORTAL } from "@/lib/subscribersPortalTable";
import { getSession } from "@/lib/session";
import {
  getPortalStaffSubscriberDebitCredits,
  portalStaffCanCreateSubscriber,
} from "@/lib/portal/portalStaffCreateSubscriber";
import { cn } from "@/lib/cn";
import { toSubscriberListClientRows } from "@/lib/dto/subscribers";
import { timeServerLoad } from "@/lib/server/devTiming";

const STATUS_FILTERS = ["active", "expired", "inactive", "expiring", "expiry", "activity"] as const;

type Props = {
  searchParams?: Promise<{
    query?: string;
    q?: string;
    reseller?: string;
    dealer?: string;
    ok?: string;
    error?: string;
    bal?: string;
    req?: string;
    renew_acc?: string;
    status?: string;
    autoRenew?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    dir?: string;
    addUser?: string;
    editAccount?: string;
  }>;
};

function buildQs(parts: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(parts)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function ManagerUsersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.type !== "MNGR") redirect("/login?error=forbidden");

  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(sp.pageSize ?? "25", 10) || 25;
  const pageSize = PAGE_SIZE_OPTIONS.some((o) => o.value === String(pageSizeRaw)) ? pageSizeRaw : 25;
  const statusRaw = sp.status?.toLowerCase();
  const status =
    statusRaw === "active" ||
    statusRaw === "expired" ||
    statusRaw === "inactive" ||
    statusRaw === "expiring" ||
    statusRaw === "expiry" ||
    statusRaw === "activity"
      ? statusRaw
      : undefined;
  const query = (sp.query?.trim() || sp.q?.trim() || "") || "";
  const autoRenewRaw = (sp.autoRenew ?? "").trim();
  const autoRenew = autoRenewRaw === "1" || autoRenewRaw === "0" ? autoRenewRaw : "";
  const resellerFilter = (sp.reseller?.trim() || "") || "";
  const dealerFilter = (sp.dealer?.trim() || "") || "";
  const sort = sp.sort ?? "account";
  const dir = sp.dir === "desc" ? "desc" : "asc";

  const listParams = {
    ownerType: "MNGR" as const,
    ownerUsername: session.username,
    resellerUsername: resellerFilter || undefined,
    dealerUsername: dealerFilter || undefined,
    status,
    search: query || undefined,
    autoRenew: autoRenew || undefined,
    page,
    pageSize,
    sort,
    dir,
  };

  const [summary, cfg, expiringSoon, { rows, total }, ownedResellers, tariffs, customPlanId] = await Promise.all([
    timeServerLoad("manager-users:summary", () =>
      getUsersSummaryScoped({ ownerType: "MNGR", ownerUsername: session.username }),
    ),
    timeServerLoad("manager-users:deductions", () => getDeductionsConfig()),
    timeServerLoad("manager-users:expiring-soon", () =>
      getScopedExpiringSoonCount({ ownerType: "MNGR", ownerUsername: session.username, withinDays: 7 }).catch(() => 0),
    ),
    timeServerLoad("manager-users:listAccountsPaged", () => listAccountsPagedScoped(listParams)),
    timeServerLoad("manager-users:owned-resellers", () => listResellersOwnedByManager(session.username)),
    timeServerLoad("manager-users:tariffs", () => listStalkerTariffPlans()),
    timeServerLoad("manager-users:custom-plan-id", () => getStalkerCustomPackagePlanId()),
  ]);
  const addonPackages =
    customPlanId != null && Number.isFinite(customPlanId) && customPlanId > 0
      ? await timeServerLoad("manager-users:addon-packages", () => listStalkerPackagesForPlan(customPlanId))
      : [];
  const resellers = ownedResellers.map((r) => ({ username: r.username, name: r.name || r.username }));

  const debitCredits = await getPortalStaffSubscriberDebitCredits(session, {
    dealerLogin: dealerFilter || undefined,
  });
  const canAddSubscriber = portalStaffCanCreateSubscriber(debitCredits);

  const validityOptions = buildValidityOptionsFromDeductionRows(cfg.rows, {
    monthFree: cfg.monthFree,
    trialLabel: "2 Days Trial",
  });

  const baseQs = {
    query: query || undefined,
    reseller: resellerFilter || undefined,
    dealer: dealerFilter || undefined,
    autoRenew: autoRenew || undefined,
    pageSize: String(pageSize),
    sort,
    dir: dir === "desc" ? "desc" : undefined,
  };
  const usersPath = "/manager/users";
  const beltHrefs = {
    all: `${usersPath}${buildQs({ ...baseQs })}`,
    active: `${usersPath}${buildQs({ ...baseQs, status: "active" })}`,
    inactive: `${usersPath}${buildQs({ ...baseQs, status: "inactive" })}`,
    expired: `${usersPath}${buildQs({ ...baseQs, status: "expired" })}`,
    expiring: `${usersPath}${buildQs({ ...baseQs, status: "expiring" })}`,
  };
  const resetReturnPath = `${usersPath}${buildQs({
    ...baseQs,
    status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
    page: String(page),
  })}`;

  const exportFilters = {
    ...(query ? { query } : {}),
    ...(resellerFilter ? { reseller: resellerFilter } : {}),
    ...(dealerFilter ? { dealer: dealerFilter } : {}),
    ...(autoRenew ? { autoRenew } : {}),
    ...(status ? { status } : {}),
  };

  const deleteErrMsg = portalUsersDeleteListErrorMessage(sp.error);
  const renewErrMsg = portalUsersRenewListErrorMessage(sp);
  const resetErrMsg = portalUsersResetListErrorMessage(sp.error);
  const statusErrMsg = portalUsersStatusQuickErrorMessage(sp.error);

  const userFlashItems: FlashToastItem[] = [
    ...(sp.ok === "1" || sp.ok === "save" ? [{ type: "success" as const, message: "Saved." }] : []),
    ...(sp.ok === "created" ? [{ type: "success" as const, message: "User created successfully." }] : []),
    ...(sp.ok === "user_saved" ? [{ type: "success" as const, message: "User profile updated successfully." }] : []),
    ...(sp.error === "save"
      ? [{ type: "error" as const, message: "Could not save user profile." }]
      : sp.error === "owner"
        ? [{ type: "error" as const, message: "Invalid owner mapping (reseller/dealer)." }]
        : sp.error === "pin"
          ? [{ type: "error" as const, message: "Parent PIN must be exactly 4 digits." }]
          : sp.error === "packages"
            ? [{ type: "error" as const, message: "Saved profile, but add-on package sync failed." }]
            : []),
    ...newEndUserCreationFlashItems(sp, "manager"),
    ...(sp.ok === "reset"
      ? [
          {
            type: "success" as const,
            message: operatorCopy.deviceResetSuccess,
          },
        ]
      : []),
    ...(sp.ok === "deleted_user"
      ? [{ type: "success" as const, message: "User account was deleted successfully." }]
      : []),
    ...(sp.ok === "renew"
      ? [{ type: "success" as const, message: "One month added." }]
      : []),
    ...(sp.ok === "renew_trial"
      ? [{ type: "success" as const, message: "Free trial applied." }]
      : []),
    ...(sp.ok === "renew_recover"
      ? [{ type: "success" as const, message: "Credits recovered from subscription." }]
      : []),
    ...(resetErrMsg ? [{ type: "error" as const, message: resetErrMsg }] : []),
    ...(deleteErrMsg ? [{ type: "error" as const, message: deleteErrMsg }] : []),
    ...(renewErrMsg ? [{ type: "error" as const, message: renewErrMsg }] : []),
    ...(statusErrMsg ? [{ type: "error" as const, message: statusErrMsg }] : []),
  ];

  const sortHref = (col: string) => {
    const nextDir = sort === col && dir === "asc" ? "desc" : "asc";
    return `${usersPath}${buildQs({
      ...baseQs,
      status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
      page: String(page),
      sort: col,
      dir: nextDir,
    })}`;
  };

  const sortUrls = {
    account: sortHref("account"),
    username: sortHref("username"),
    full_name: sortHref("full_name"),
    mac: sortHref("mac"),
    status: sortHref("status"),
    created: sortHref("created"),
    expires: sortHref("expires"),
  };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const perPageHrefByValue = Object.fromEntries(
    PAGE_SIZE_OPTIONS.map((opt) => [
      opt.value,
      `${usersPath}${buildQs({
        query: query || undefined,
        reseller: resellerFilter || undefined,
        dealer: dealerFilter || undefined,
        autoRenew: autoRenew || undefined,
        status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
        pageSize: opt.value,
        sort: sort !== "account" ? sort : undefined,
        dir: dir === "desc" ? "desc" : undefined,
      })}`,
    ]),
  ) as Record<string, string>;
  const statusHrefByValue = Object.fromEntries(
    SUBSCRIBER_STATUS_FILTER_OPTIONS.map((opt) => [
      opt.value,
      `${usersPath}${buildQs({
        query: query || undefined,
        reseller: resellerFilter || undefined,
        dealer: dealerFilter || undefined,
        autoRenew: autoRenew || undefined,
        status: opt.value || undefined,
        pageSize: String(pageSize),
        sort: sort !== "account" ? sort : undefined,
        dir: dir === "desc" ? "desc" : undefined,
      })}`,
    ]),
  ) as Record<string, string>;
  const autoRenewOptions = [
    { value: "", label: "Renew All" },
    { value: "1", label: "Renew Yes" },
    { value: "0", label: "Renew No" },
  ] as const;
  const autoRenewHrefByValue = Object.fromEntries(
    autoRenewOptions.map((opt) => [
      opt.value,
      `${usersPath}${buildQs({
        query: query || undefined,
        reseller: resellerFilter || undefined,
        dealer: dealerFilter || undefined,
        autoRenew: opt.value || undefined,
        status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
        pageSize: String(pageSize),
        sort: sort !== "account" ? sort : undefined,
        dir: dir === "desc" ? "desc" : undefined,
      })}`,
    ]),
  ) as Record<string, string>;
  const filterNotice = resellerFilter
    ? {
        message: "Showing users for reseller",
        value: resellerFilter,
        clearLabel: "Clear reseller filter",
        clearHref: `${usersPath}${buildQs({
          query: query || undefined,
          dealer: dealerFilter || undefined,
          autoRenew: autoRenew || undefined,
          status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
          pageSize: String(pageSize),
          sort,
          dir: dir === "desc" ? "desc" : undefined,
        })}`,
      }
    : dealerFilter
      ? {
          message: "Showing users for dealer",
          value: dealerFilter,
          clearLabel: "Clear dealer filter",
          clearHref: `${usersPath}${buildQs({
            query: query || undefined,
            reseller: resellerFilter || undefined,
            autoRenew: autoRenew || undefined,
            status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
            pageSize: String(pageSize),
            sort,
            dir: dir === "desc" ? "desc" : undefined,
          })}`,
        }
      : undefined;

  const totalAllAccounts = Math.max(0, Number(summary.all) || 0);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-5 px-3 pt-4 sm:space-y-6 sm:px-5 sm:pt-5">
      
      <PageHeader title="Users" breadcrumb="Manage and monitor user accounts under your hierarchy." showBack={false} />

      <UsersStatusKpiPopupLauncher
        total={Math.max(0, Number(summary.all) || 0)}
        active={Math.max(0, Number(summary.active) || 0)}
        inactive={Math.max(0, Number(summary.inactive) || 0)}
        expired={Math.max(0, Number(summary.expired) || 0)}
        expiring={Math.max(0, Number(expiringSoon) || 0)}
        expiringEnabled
        beltHrefs={beltHrefs}
      />
      </div>

      <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden border-t border-border/40">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AdminSubscribersTableLazy
          rows={toSubscriberListClientRows(rows)}
          validityOptions={validityOptions}
          sortUrls={sortUrls}
          sort={sort}
          dir={dir}
          resetReturnPath={resetReturnPath}
          recoverBonusEnabled={cfg.recoverBonus}
          filterNotice={filterNotice}
          subscribersPortal={MANAGER_SUBSCRIBERS_PORTAL}
          actionLinks={{
            exportFilters,
            addSubscriberHref: "/manager/users/new",
            canAddSubscriber,
          }}
          embedded
          toolbarFilters={{
            query,
            status: status ?? "",
            autoRenew,
            statusOptions: SUBSCRIBER_STATUS_FILTER_OPTIONS,
            statusHrefByValue,
            autoRenewOptions: [...autoRenewOptions],
            autoRenewHrefByValue,
            pageSize: String(pageSize),
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            pageSizeHrefByValue: perPageHrefByValue,
            searchAction: usersPath,
            searchHiddenParams: {
              ...(resellerFilter ? { reseller: resellerFilter } : {}),
              ...(dealerFilter ? { dealer: dealerFilter } : {}),
              pageSize: String(pageSize),
              ...(sort !== "account" ? { sort } : {}),
              ...(dir === "desc" ? { dir: "desc" } : {}),
              page: "1",
            },
          }}
          addUserModalData={{
            resellers,
            tariffs,
            validityOptions,
            customPlanId,
            addonPackages,
          }}
          initialAddUserOpen={sp.addUser === "1" && canAddSubscriber}
          initialEditAccount={(sp.editAccount ?? "").trim()}
        />
        </div>
        <StaffListTableFooterBar
          pagination={
          <nav
            className="flex shrink-0 flex-nowrap items-center justify-center gap-0.5 sm:gap-1"
            aria-label="Users list pages"
          >
            <Link
              href={`${usersPath}${buildQs({
                ...baseQs,
                status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
                page: String(page - 1),
              })}`}
              aria-disabled={page <= 1}
              aria-label="Previous page"
              prefetch={false}
              className={cn(
                managersStaffPageBtnBaseClass,
                "font-medium",
                page <= 1 ? "pointer-events-none border-border/40 text-muted-foreground opacity-50" : "border-border/70 hover:bg-muted/50",
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {buildManagersStaffPaginationItems(totalPages, page).map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="inline-flex min-w-6 select-none items-center justify-center px-0.5 text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : item === page ? (
                <span
                  key={item}
                  aria-current="page"
                  className={cn(managersStaffPageBtnBaseClass, "cursor-default border-primary/45 bg-primary/12 font-semibold text-primary")}
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={`${usersPath}${buildQs({
                    ...baseQs,
                    status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
                    page: String(item),
                  })}`}
                  prefetch={false}
                  className={cn(managersStaffPageBtnBaseClass, "border-border/70 text-foreground hover:bg-muted/50")}
                >
                  {item}
                </Link>
              ),
            )}
            <form method="get" action={usersPath} className="ml-0.5 inline-flex items-center gap-0.5">
              {query ? <input type="hidden" name="query" value={query} /> : null}
              {resellerFilter ? <input type="hidden" name="reseller" value={resellerFilter} /> : null}
              {dealerFilter ? <input type="hidden" name="dealer" value={dealerFilter} /> : null}
              {autoRenew ? <input type="hidden" name="autoRenew" value={autoRenew} /> : null}
              {status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? (
                <input type="hidden" name="status" value={status} />
              ) : null}
              <input type="hidden" name="pageSize" value={String(pageSize)} />
              {sort !== "account" ? <input type="hidden" name="sort" value={sort} /> : null}
              {dir === "desc" ? <input type="hidden" name="dir" value="desc" /> : null}
              <label htmlFor="manager-users-jump-page" className="sr-only">
                Go to page
              </label>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pg</span>
              <input
                id="manager-users-jump-page"
                name="page"
                type="number"
                min={1}
                max={totalPages}
                defaultValue={page}
                inputMode="numeric"
                className="h-7 w-11 appearance-none rounded-md border-x-1 border-border/70 bg-background px-1 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </form>
            <Link
              href={`${usersPath}${buildQs({
                ...baseQs,
                status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
                page: String(page + 1),
              })}`}
              aria-disabled={page >= totalPages}
              aria-label="Next page"
              prefetch={false}
              className={cn(
                managersStaffPageBtnBaseClass,
                "font-medium",
                page >= totalPages
                  ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                  : "border-border/70 hover:bg-muted/50",
              )}
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </nav>
          }
          summary={
            <>
              Showing <span className="font-medium text-foreground">{rows.length}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> filtered row{total === 1 ? "" : "s"} (
              {totalAllAccounts} total users)
              {query ? ` for “${query}”.` : "."}
            </>
          }
        />
      </section>
    </div>
  );
}