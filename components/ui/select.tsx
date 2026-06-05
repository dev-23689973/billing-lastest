"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import {
  managersToolbarNativeSelectClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";

const SelectRoot = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      managersToolbarSelectTriggerClass,
      "data-[placeholder]:text-muted-foreground",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&>span]:line-clamp-1 [&>span]:text-left",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-80" aria-hidden />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
  /** HUD corner ticks use the same border token as the panel (managers toolbar menus). */
  hudCorners?: boolean;
  /**
   * Lock panel width to the trigger (compact form fields).
   * Default false: menu is at least trigger-wide and grows for long labels.
   */
  clampToTriggerWidth?: boolean;
  /** Merged into the inner viewport (below default padding / scrollbar classes). */
  viewportClassName?: string;
};

const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, SelectContentProps>(
  ({ className, children, position = "popper", hudCorners, clampToTriggerWidth = false, viewportClassName, ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={4}
        collisionPadding={12}
        data-form-select-clamp-trigger={clampToTriggerWidth ? "true" : undefined}
        className={cn(
          "relative z-[250] box-border max-h-[min(18rem,var(--radix-select-content-available-height))] overflow-hidden border border-border bg-card text-card-foreground shadow-lg ring-1 ring-black/[0.04] dark:bg-popover dark:ring-white/[0.06]",
          clampToTriggerWidth
            ? "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
            : "min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(20rem,var(--radix-select-content-available-width))]",
          hudCorners ? "rounded-none p-0 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)] ring-0" : "rounded-lg",
          position === "popper" && "motion-safe:transition-[opacity,transform] motion-safe:duration-150",
          className,
        )}
        {...props}
      >
        {hudCorners ? <HudCornerOverlay /> : null}
        <SelectPrimitive.Viewport
          className={cn(
            "thin-scrollbar max-h-[inherit] min-w-0 w-full max-w-full overflow-y-auto p-0.5",
            !clampToTriggerWidth && "w-max",
            position === "popper" && "w-full",
            hudCorners && "relative z-[1]",
            viewportClassName,
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export type SelectItemProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
  /** When false, no checkmark column (tighter rows; selection still in `data-[state=checked]`). */
  showCheck?: boolean;
};

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, SelectItemProps>(
  ({ className, children, showCheck = true, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex min-h-6 w-full cursor-pointer select-none items-center whitespace-nowrap rounded-md py-1 pr-2 text-sm font-medium leading-snug text-foreground outline-none transition-[color,background-color] duration-150",
        showCheck ? "pl-7" : "pl-2.5",
        "data-[highlighted]:bg-muted/55 data-[highlighted]:text-foreground",
        "data-[state=checked]:bg-muted/70",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      {showCheck ? (
        <span className="absolute left-1.5 flex h-4 w-4 items-center justify-center text-primary">
          <SelectPrimitive.ItemIndicator>
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
          </SelectPrimitive.ItemIndicator>
        </span>
      ) : null}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

/** Native `<select>` with app styling (use for huge option lists, e.g. 2000+ rows). */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(managersToolbarNativeSelectClass, className)}
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    }}
    {...props}
  />
));
NativeSelect.displayName = "NativeSelect";

export type SelectProps = React.ComponentProps<typeof NativeSelect>;

export {
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  NativeSelect,
  /** Backward-compatible native `<select>` (id, name, children `<option>`). */
  NativeSelect as Select,
};
