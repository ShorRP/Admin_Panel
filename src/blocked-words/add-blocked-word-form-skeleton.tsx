import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import {
  ACTION_COLUMN_CLASSES,
  ACTION_ROW_CLASSES,
  FORM_CARD_CLASSES,
  FORM_CONTROL_CLASSES,
} from "./add-blocked-word-form-layout"

const BAR_CLASSES = cn(
  "w-full motion-reduce:animate-none",
  FORM_CONTROL_CLASSES
)

export function AddBlockedWordFormSkeleton() {
  return (
    <div role="status" className={FORM_CARD_CLASSES}>
      <span className="sr-only">Chargement du formulaire…</span>
      <Skeleton className="h-4.5 w-52 motion-reduce:animate-none" />
      <Skeleton className={cn("mt-2.5", BAR_CLASSES)} />
      <div className={ACTION_ROW_CLASSES}>
        <div className={ACTION_COLUMN_CLASSES}>
          <Skeleton className="h-4.5 w-12 motion-reduce:animate-none" />
          <Skeleton className={BAR_CLASSES} />
        </div>
        <Skeleton className={cn(BAR_CLASSES, "sm:w-24")} />
      </div>
    </div>
  )
}
