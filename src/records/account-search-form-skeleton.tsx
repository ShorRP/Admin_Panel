import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import {
  CHOICE_FIELD_CLASSES,
  CHOICES_CLASSES,
  FILTERS_BUTTON_CLASSES,
  SEARCH_FIELD_CLASSES,
  SEARCH_FORM_CLASSES,
  SELECT_SKELETON_CLASSES,
  SUBMIT_CLASSES,
} from "./account-search-form-layout"

const CHOICE_LABEL_WIDTHS = [
  "w-8",
  "w-10",
  "w-36",
  "w-32",
  "w-28",
  "w-20",
] as const

const BAR_CLASSES = cn("motion-reduce:animate-none")

export function AccountSearchFormSkeleton() {
  return (
    <div role="status" className={SEARCH_FORM_CLASSES}>
      <span className="sr-only">Chargement de la recherche…</span>
      <div className={SEARCH_FIELD_CLASSES}>
        <Skeleton className={cn("h-3.5 w-16", BAR_CLASSES)} />
        <Skeleton className={cn("h-11 w-full", BAR_CLASSES)} />
      </div>
      <div className={CHOICES_CLASSES}>
        <Skeleton
          className={cn(
            SELECT_SKELETON_CLASSES,
            FILTERS_BUTTON_CLASSES,
            BAR_CLASSES
          )}
        />
        {CHOICE_LABEL_WIDTHS.map((width) => (
          <div key={width} className={CHOICE_FIELD_CLASSES}>
            <Skeleton className={cn("h-3.5", BAR_CLASSES, width)} />
            <Skeleton className={cn(SELECT_SKELETON_CLASSES, BAR_CLASSES)} />
          </div>
        ))}
        <Skeleton className={cn(SUBMIT_CLASSES, BAR_CLASSES, "md:w-28")} />
      </div>
    </div>
  )
}
