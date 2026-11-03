import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import {
  CHOICE_FIELD_CLASSES,
  CHOICES_CLASSES,
  FILTERS_BUTTON_CLASSES,
  SEARCH_FIELD_CLASSES,
  SEARCH_FORM_CLASSES,
} from "./account-search-form-layout"

const CHOICE_LABEL_WIDTHS = [
  "w-8",
  "w-10",
  "w-36",
  "w-32",
  "w-28",
  "w-20",
] as const

const BUTTON_CLASSES = cn("h-9.5 w-full motion-reduce:animate-none touch:h-11")

export function AccountSearchFormSkeleton() {
  return (
    <div role="status" className={SEARCH_FORM_CLASSES}>
      <span className="sr-only">Chargement de la recherche…</span>
      <div className={SEARCH_FIELD_CLASSES}>
        <Skeleton className="h-3.5 w-16 motion-reduce:animate-none" />
        <Skeleton className="h-11 w-full motion-reduce:animate-none" />
      </div>
      <div className={CHOICES_CLASSES}>
        <Skeleton className={cn(BUTTON_CLASSES, FILTERS_BUTTON_CLASSES)} />
        {CHOICE_LABEL_WIDTHS.map((width) => (
          <div key={width} className={CHOICE_FIELD_CLASSES}>
            <Skeleton
              className={cn("h-3.5 motion-reduce:animate-none", width)}
            />
            <Skeleton className={BUTTON_CLASSES} />
          </div>
        ))}
        <Skeleton className={cn(BUTTON_CLASSES, "md:w-28")} />
      </div>
    </div>
  )
}
