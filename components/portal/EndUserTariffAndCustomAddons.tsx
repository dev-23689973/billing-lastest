"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { CustomAddonPackagesModal } from "@/components/portal/CustomAddonPackagesModal";
import { FormField } from "@/components/forms/form-field";
import { SearchableFormSelect } from "@/components/forms/SearchableFormSelect";
import { NativeSelect } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { isCustomPackageSelectionIncomplete } from "@/lib/endUserCustomPackageValidation";

type TariffOpt = { id: number; name: string };
type AddonPkg = { package_id: number; name: string };

const SelectedPackChip = memo(function SelectedPackChip({
  packageId,
  name,
  compact,
  onRemove,
}: {
  packageId: number;
  name: string;
  compact: boolean;
  onRemove: (id: number) => void;
}) {
  const remove = useCallback(() => onRemove(packageId), [onRemove, packageId]);
  return (
    <li>
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-muted/30 py-0.5 pl-2 pr-0.5 text-foreground",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        <span className="min-w-0 truncate font-medium" title={name}>
          {name}
        </span>
        <button
          type="button"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          aria-label={`Remove ${name}`}
          onClick={remove}
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      </span>
    </li>
  );
});

/**
 * Package selector + optional `packs[]` when the chosen tariff is Stalker “CUSTOM PACKAGE”.
 */
export const EndUserTariffAndCustomAddons = memo(function EndUserTariffAndCustomAddons({
  tariffs,
  customPlanId,
  addonPackages,
  initialPlanId,
  initialSelectedPackIds,
  compact = false,
  fieldLayout = "stacked",
  fieldClassName,
  controlClassName = "w-full",
  onSelectionChange,
}: {
  tariffs: TariffOpt[];
  customPlanId: number | null;
  addonPackages: AddonPkg[];
  initialPlanId?: number | null;
  initialSelectedPackIds?: number[];
  compact?: boolean;
  fieldLayout?: "stacked" | "horizontal";
  fieldClassName?: string;
  controlClassName?: string;
  onSelectionChange?: (state: {
    planId: number;
    isCustomPlan: boolean;
    selectedPackCount: number;
    needsPackages: boolean;
  }) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState<Set<number>>(
    () => new Set((initialSelectedPackIds ?? []).filter((n) => Number.isFinite(n) && n > 0)),
  );
  const initialSelectedPacksKey = useMemo(
    () =>
      (initialSelectedPackIds ?? [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
        .join(","),
    [initialSelectedPackIds],
  );

  const firstId = tariffs[0]?.id;
  const [plan, setPlan] = useState(() => {
    if (initialPlanId != null && Number.isFinite(initialPlanId) && initialPlanId > 0) return String(initialPlanId);
    return firstId != null ? String(firstId) : "";
  });

  const planNum = Number.parseInt(plan, 10);
  const showAddons =
    customPlanId != null && addonPackages.length > 0 && Number.isFinite(planNum) && planNum === customPlanId;

  const packageOptions = useMemo(() => tariffs.map((t) => ({ value: String(t.id), label: t.name })), [tariffs]);

  const selectedPackages = useMemo(
    () => addonPackages.filter((p) => selectedPacks.has(p.package_id)),
    [addonPackages, selectedPacks],
  );

  const removePack = useCallback((id: number) => {
    setSelectedPacks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const nextPlan =
      initialPlanId != null && Number.isFinite(initialPlanId) && initialPlanId > 0
        ? String(initialPlanId)
        : firstId != null
          ? String(firstId)
          : "";
    setPlan(nextPlan);
  }, [initialPlanId, firstId]);

  useEffect(() => {
    const ids =
      initialSelectedPacksKey === ""
        ? []
        : initialSelectedPacksKey
            .split(",")
            .map((v) => Number(v))
            .filter((n) => Number.isFinite(n) && n > 0);
    setSelectedPacks(new Set(ids));
  }, [initialSelectedPacksKey]);

  const needsPackages = isCustomPackageSelectionIncomplete(customPlanId, planNum, selectedPacks.size);

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange({
      planId: Number.isFinite(planNum) ? planNum : 0,
      isCustomPlan: showAddons,
      selectedPackCount: selectedPacks.size,
      needsPackages,
    });
  }, [needsPackages, onSelectionChange, planNum, selectedPacks.size, showAddons]);

  if (!tariffs.length) {
    return (
      <FormField
        id="pkg-empty"
        label="Package"
        density={compact ? "compact" : "default"}
        layout={fieldLayout}
        className={fieldClassName}
      >
        <NativeSelect id="pkg-empty" name="package" disabled value="" className={cn(controlClassName, "opacity-70")}>
          <option value="">No packages</option>
        </NativeSelect>
      </FormField>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-1.5">
      <FormField
        id="pkg-select"
        label="Package"
        density={compact ? "compact" : "default"}
        layout={fieldLayout}
        className={fieldClassName}
      >
        <SearchableFormSelect
          id="pkg-select"
          name="package"
          required
          value={plan}
          onValueChange={setPlan}
          options={packageOptions}
          placeholder="Select package"
          searchPlaceholder="Search package..."
          className={controlClassName}
          size={compact ? "compact" : "default"}
        />
      </FormField>

      {showAddons ? (
        <div className="min-w-0 w-full space-y-2 pt-0.5">
          {Array.from(selectedPacks).map((id) => (
            <input key={id} type="hidden" name="packs" value={String(id)} />
          ))}

          <div className="space-y-1">
            <p className={cn("font-semibold text-primary", compact ? "text-xs" : "text-sm")}>Select packages</p>
            {selectedPackages.length === 0 ? (
              <p
                className={cn(
                  compact ? "text-xs" : "text-sm",
                  needsPackages ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                {needsPackages ? "Required: select at least one package" : "No packages selected yet"}
              </p>
            ) : (
              <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Selected packages">
                {selectedPackages.map((p) => (
                  <SelectedPackChip
                    key={p.package_id}
                    packageId={p.package_id}
                    name={p.name || `Package #${p.package_id}`}
                    compact={compact}
                    onRemove={removePack}
                  />
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={cn(
              "flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border-2 border-dashed",
              "border-primary/35 bg-primary/[0.04] text-primary hover:border-primary/55 hover:bg-primary/[0.08]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              compact ? "px-3 py-3 text-xs" : "px-4 py-4 text-sm",
            )}
          >
            <Plus className={cn("shrink-0 stroke-[2.5]", compact ? "h-4 w-4" : "h-5 w-5")} aria-hidden />
            <span className="font-semibold">Select packages</span>
            {selectedPacks.size > 0 ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums">
                {selectedPacks.size}
              </span>
            ) : null}
          </button>

          <CustomAddonPackagesModal
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            packages={addonPackages}
            initialSelectedIds={selectedPacks}
            onApply={setSelectedPacks}
          />
        </div>
      ) : null}
    </div>
  );
});
