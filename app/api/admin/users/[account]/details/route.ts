import { migratedGetRouteGone } from "@/lib/api/migratedGetRoute";

/** Replaced by `loadEndUserDetailsModalAction`. */
export async function GET() {
  return migratedGetRouteGone();
}
