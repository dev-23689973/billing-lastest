import { revalidatePath } from "next/cache";

/** RSC pages that embed hierarchy add-credit min/max from `getSettings()`. */
export function revalidateHierarchyCreditPaths(): void {
  const paths = ["/admin/managers", "/manager/resellers", "/reseller/dealers"];
  for (const path of paths) {
    revalidatePath(path);
  }
}
