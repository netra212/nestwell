"use client";
import type { ComponentProps } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FilterPanel } from "./filter-panel";
export function MobileFilters({
  open,
  onOpenChange,
  filters,
  apply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ComponentProps<typeof FilterPanel>;
  apply: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(90vw,360px)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Property filters</SheetTitle>
          <SheetDescription>
            Find the details that feel like home.
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 pb-8">
          <FilterPanel {...filters} apply={apply} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
