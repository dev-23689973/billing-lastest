import { unstable_cache } from "next/cache";
import {
  getDeductionsConfig,
  getUsersSummary,
  listManagersForSelect,
  listResellersForSelect,
  listStalkerTariffPlans,
} from "@/lib/data";
import { getStalkerCustomPackagePlanId } from "@/lib/repos/stalkerUserPackages";

const USERS_PAGE_REVALIDATE_SECONDS = 90;

export const getCachedUsersSummary = unstable_cache(
  async () => getUsersSummary(),
  ["users-page-summary"],
  { revalidate: USERS_PAGE_REVALIDATE_SECONDS, tags: ["users-page-summary"] },
);

export const getCachedUsersPageDeductionsConfig = unstable_cache(
  async () => getDeductionsConfig(),
  ["users-page-deductions-config"],
  { revalidate: USERS_PAGE_REVALIDATE_SECONDS },
);

export const getCachedResellersForSelect = unstable_cache(
  async () => listResellersForSelect(),
  ["users-page-resellers-select"],
  { revalidate: USERS_PAGE_REVALIDATE_SECONDS },
);

export const getCachedManagersForSelect = unstable_cache(
  async () => listManagersForSelect(),
  ["users-page-managers-select"],
  { revalidate: USERS_PAGE_REVALIDATE_SECONDS },
);

export const getCachedStalkerTariffPlans = unstable_cache(
  async () => listStalkerTariffPlans(),
  ["users-page-tariff-plans"],
  { revalidate: USERS_PAGE_REVALIDATE_SECONDS },
);

export const getCachedStalkerCustomPackagePlanId = unstable_cache(
  async () => getStalkerCustomPackagePlanId(),
  ["users-page-custom-plan-id"],
  { revalidate: USERS_PAGE_REVALIDATE_SECONDS },
);
