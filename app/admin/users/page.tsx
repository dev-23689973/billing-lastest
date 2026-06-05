import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listAccountsPaged } from "@/lib/data";
import { getCachedAdminExpiringSoonCount } from "@/lib/dashboard/cachedDashboardQueries";
import { buildValidityOptionsFromDeductionRows } from "@/lib/validityOptions";
import { listStalkerPackagesForPlan } from "@/lib/repos/stalkerUserPackages";
import { getCachedAdminNotificationPrefs } from "@/lib/layout/cachedLayoutQueries";
import {
  getCachedManagersForSelect,
  getCachedResellersForSelect,
  getCachedStalkerCustomPackagePlanId,
  getCachedStalkerTariffPlans,
  getCachedUsersPageDeductionsConfig,
  getCachedUsersSummary,
} from "@/lib/list-pages/cachedUsersPageQueries";
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
import { toSubscriberListClientRows } from "@/lib/dto/subscribers";
import { cn } from "@/lib/cn";
import { timeServerLoad } from "@/lib/server/devTiming";

const STATUS_FILTERS = ["active", "expired", "inactive", "expiring", "expiry", "activity"] as const;

type Props = {
  searchParams?: Promise<{
    query?: string;
    q?: string;
    /** Exact billing manager login — subscribers under that manager’s hierarchy only. */
    manager?: string;
    /** Exact reseller login — subscribers under that reseller’s branch. */
    reseller?: string;
    /** Exact dealer login (`accounts.username`) — subscribers owned by that dealer. */
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

export default async function UsersPage({ searchParams }: Props) {
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
  const managerFilter = (sp.manager?.trim() || "") || "";
  const resellerFilter = (sp.reseller?.trim() || "") || "";
  const dealerFilter = (sp.dealer?.trim() || "") || "";
  const sort = sp.sort ?? "manager";
  const dir = sp.dir === "desc" ? "desc" : "asc";

  const listParams = {
    status,
    search: query || undefined,
    autoRenew: autoRenew || undefined,
    managerLogin: managerFilter || undefined,
    resellerLogin: resellerFilter || undefined,
    dealerLogin: dealerFilter || undefined,
    page,
    pageSize,
    sort,
    dir,
  } as const;

  const notifyPrefs = await getCachedAdminNotificationPrefs();

  const [summary, cfg, expiringSoon, { rows, total }, managers, resellers, tariffs, customPlanId] = await Promise.all([
    timeServerLoad("admin-users:summary", () => getCachedUsersSummary()),
    timeServerLoad("admin-users:deductions", () => getCachedUsersPageDeductionsConfig()),
    notifyPrefs.notifyExpiringSubscriptions
      ? timeServerLoad("admin-users:expiring-soon", () => getCachedAdminExpiringSoonCount().catch(() => 0))
      : Promise.resolve(0),
    timeServerLoad("admin-users:listAccountsPaged", () => listAccountsPaged(listParams)),
    timeServerLoad("admin-users:managers", () => getCachedManagersForSelect()),
    timeServerLoad("admin-users:resellers", () => getCachedResellersForSelect()),
    timeServerLoad("admin-users:tariffs", () => getCachedStalkerTariffPlans()),
    timeServerLoad("admin-users:custom-plan-id", () => getCachedStalkerCustomPackagePlanId()),
  ]);
  const addonPackages =
    customPlanId != null && Number.isFinite(customPlanId) && customPlanId > 0
      ? await timeServerLoad("admin-users:addon-packages", () => listStalkerPackagesForPlan(customPlanId))
      : [];

  const validityOptions = buildValidityOptionsFromDeductionRows(cfg.rows, {
    monthFree: cfg.monthFree,
    trialLabel: "2 Days Trial",
  });

  const baseQs = {
    query: query || undefined,
    manager: managerFilter || undefined,
    reseller: resellerFilter || undefined,
    dealer: dealerFilter || undefined,
    autoRenew: autoRenew || undefined,
    pageSize: String(pageSize),
    sort,
    dir: dir === "desc" ? "desc" : undefined,
  };
  const beltHrefs = {
    all: `/admin/users${buildQs({ ...baseQs })}`,
    active: `/admin/users${buildQs({ ...baseQs, status: "active" })}`,
    inactive: `/admin/users${buildQs({ ...baseQs, status: "inactive" })}`,
    expired: `/admin/users${buildQs({ ...baseQs, status: "expired" })}`,
    expiring: `/admin/users${buildQs({ ...baseQs, status: "expiring" })}`,
  };
  const resetReturnPath = `/admin/users${buildQs({
    ...baseQs,
    status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
    page: String(page),
  })}`;

  const exportFilters = {
    ...(query ? { query } : {}),
    ...(managerFilter ? { manager: managerFilter } : {}),
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
      : sp.error === "missing_manager"
        ? [{ type: "error" as const, message: "Please select a manager." }]
      : sp.error === "owner"
        ? [{ type: "error" as const, message: "Invalid owner mapping (reseller/dealer)." }]
        : sp.error === "pin"
          ? [{ type: "error" as const, message: "Parent PIN must be exactly 4 digits." }]
          : sp.error === "packages"
            ? [{ type: "error" as const, message: "Saved profile, but add-on package sync failed." }]
            : []),
    ...newEndUserCreationFlashItems(sp, "admin"),
    ...(sp.ok === "reset"
      ? [{ type: "success" as const, message: operatorCopy.deviceResetSuccess }]
      : []),
    ...(sp.ok === "deleted_user"
      ? [{ type: "success" as const, message: operatorCopy.accountDeleted }]
      : []),
    ...(sp.ok === "renew"
      ? [{ type: "success" as const, message: operatorCopy.subscriptionExtended }]
      : []),
    ...(sp.ok === "renew_trial"
      ? [{ type: "success" as const, message: operatorCopy.freeTrialApplied }]
      : []),
    ...(sp.ok === "renew_recover"
      ? [{ type: "success" as const, message: operatorCopy.creditsRecovered }]
      : []),
    ...(resetErrMsg ? [{ type: "error" as const, message: resetErrMsg }] : []),
    ...(deleteErrMsg ? [{ type: "error" as const, message: deleteErrMsg }] : []),
    ...(renewErrMsg ? [{ type: "error" as const, message: renewErrMsg }] : []),
    ...(statusErrMsg ? [{ type: "error" as const, message: statusErrMsg }] : []),
  ];

  const sortHref = (col: string) => {
    const nextDir = sort === col && dir === "asc" ? "desc" : "asc";
    return `/admin/users${buildQs({
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
      `/admin/users${buildQs({
        query: query || undefined,
        manager: managerFilter || undefined,
        reseller: resellerFilter || undefined,
        dealer: dealerFilter || undefined,
        autoRenew: autoRenew || undefined,
        status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
        pageSize: opt.value,
        sort: sort !== "manager" ? sort : undefined,
        dir: dir === "desc" ? "desc" : undefined,
      })}`,
    ]),
  ) as Record<string, string>;
  const statusHrefByValue = Object.fromEntries(
    SUBSCRIBER_STATUS_FILTER_OPTIONS.map((opt) => [
      opt.value,
      `/admin/users${buildQs({
        query: query || undefined,
        manager: managerFilter || undefined,
        reseller: resellerFilter || undefined,
        dealer: dealerFilter || undefined,
        autoRenew: autoRenew || undefined,
        status: opt.value || undefined,
        pageSize: String(pageSize),
        sort: sort !== "manager" ? sort : undefined,
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
      `/admin/users${buildQs({
        query: query || undefined,
        manager: managerFilter || undefined,
        reseller: resellerFilter || undefined,
        dealer: dealerFilter || undefined,
        autoRenew: opt.value || undefined,
        status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
        pageSize: String(pageSize),
        sort: sort !== "manager" ? sort : undefined,
        dir: dir === "desc" ? "desc" : undefined,
      })}`,
    ]),
  ) as Record<string, string>;
  const filterNotice = managerFilter
    ? {
        message: "Showing users for manager",
        value: managerFilter,
        clearLabel: "Clear manager filter",
        clearHref: `/admin/users${buildQs({
          query: query || undefined,
          reseller: resellerFilter || undefined,
          dealer: dealerFilter || undefined,
          autoRenew: autoRenew || undefined,
          status: status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? status : undefined,
          pageSize: String(pageSize),
          sort,
          dir: dir === "desc" ? "desc" : undefined,
        })}`,
      }
    : resellerFilter
      ? {
          message: "Showing users for reseller",
          value: resellerFilter,
          clearLabel: "Clear reseller filter",
          clearHref: `/admin/users${buildQs({
            query: query || undefined,
            manager: managerFilter || undefined,
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
            clearHref: `/admin/users${buildQs({
              query: query || undefined,
              manager: managerFilter || undefined,
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
      
      <PageHeader
        title="Users"
        breadcrumb="Manage and monitor all user accounts."
        showBack={false}
      />

      <UsersStatusKpiPopupLauncher
        total={Math.max(0, Number(summary.all) || 0)}
        active={Math.max(0, Number(summary.active) || 0)}
        inactive={Math.max(0, Number(summary.inactive) || 0)}
        expired={Math.max(0, Number(summary.expired) || 0)}
        expiring={Math.max(0, Number(expiringSoon) || 0)}
        expiringEnabled={notifyPrefs.notifyExpiringSubscriptions}
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
          actionLinks={{ exportFilters, addSubscriberHref: "/admin/users/new" }}
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
            searchAction: "/admin/users",
            searchHiddenParams: {
              ...(managerFilter ? { manager: managerFilter } : {}),
              ...(resellerFilter ? { reseller: resellerFilter } : {}),
              ...(dealerFilter ? { dealer: dealerFilter } : {}),
              pageSize: String(pageSize),
              ...(sort !== "manager" ? { sort } : {}),
              ...(dir === "desc" ? { dir: "desc" } : {}),
              page: "1",
            },
          }}
          addUserModalData={{
            managers,
            resellers,
            tariffs,
            validityOptions,
            customPlanId,
            addonPackages,
          }}
          initialAddUserOpen={sp.addUser === "1"}
          initialEditAccount={(sp.editAccount ?? "").trim()}
        />
        </div>
        <StaffListTableFooterBar
          tip="Tip: use the Status switch to activate or suspend an account."
          pagination={
          <nav
            className="flex shrink-0 flex-nowrap items-center justify-center gap-0.5 sm:gap-1"
            aria-label="Users list pages"
          >
            <Link
              href={`/admin/users${buildQs({
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
                  href={`/admin/users${buildQs({
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
            <form method="get" action="/admin/users" className="ml-0.5 inline-flex items-center gap-0.5">
              {query ? <input type="hidden" name="query" value={query} /> : null}
              {managerFilter ? <input type="hidden" name="manager" value={managerFilter} /> : null}
              {resellerFilter ? <input type="hidden" name="reseller" value={resellerFilter} /> : null}
              {dealerFilter ? <input type="hidden" name="dealer" value={dealerFilter} /> : null}
              {autoRenew ? <input type="hidden" name="autoRenew" value={autoRenew} /> : null}
              {status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? (
                <input type="hidden" name="status" value={status} />
              ) : null}
              <input type="hidden" name="pageSize" value={String(pageSize)} />
              {sort !== "manager" ? <input type="hidden" name="sort" value={sort} /> : null}
              {dir === "desc" ? <input type="hidden" name="dir" value="desc" /> : null}
              <label htmlFor="users-jump-page" className="sr-only">
                Go to page
              </label>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">Pg</span>
              <input
                id="users-jump-page"
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
              href={`/admin/users${buildQs({
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
