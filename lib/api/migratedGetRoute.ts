import { apiJson } from "@/lib/dto/apiJson";

/** Legacy GET routes replaced by server actions — block direct browser/API access. */
export function migratedGetRouteGone() {
  return apiJson(
    {
      ok: false,
      error: "migrated",
      message: "This endpoint was replaced by a server action. Use the application UI instead.",
    },
    { status: 410 },
  );
}

