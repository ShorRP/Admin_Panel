import { FilterFormSkeleton } from "@/ui/filter-form-skeleton"
import { FILTER_FIELD_CLASSES } from "@/ui/filter-layout"
import { LogSkeleton } from "@/ui/log-skeleton"
import { Skeleton } from "@/ui/skeleton"

const CATEGORY_WIDTHS = ["w-13", "w-28", "w-24"] as const

const LABEL_WIDTHS = [
  "w-11",
  "w-16",
  "w-20",
  "w-9",
  "w-14",
  "w-12",
  "w-10",
  "w-8",
  "w-5",
  "w-6",
] as const

export function GameLogSkeleton() {
  return (
    <LogSkeleton
      loading="Chargement du journal du jeu…"
      pillWidths={CATEGORY_WIDTHS}
      form={
        <FilterFormSkeleton
          labelWidths={LABEL_WIDTHS}
          fieldClassName={FILTER_FIELD_CLASSES}
        />
      }
      trailing={
        <Skeleton className="ml-auto h-3.5 w-28 motion-reduce:animate-none" />
      }
    />
  )
}
