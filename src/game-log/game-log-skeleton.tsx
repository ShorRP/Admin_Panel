import { FilterFormSkeleton } from "@/ui/filter-form-skeleton"
import { LogSkeleton } from "@/ui/log-skeleton"
import { Skeleton } from "@/ui/skeleton"
import { FILTER_FIELD_CLASSES } from "./game-log-layout"

const LABEL_WIDTHS = ["w-10"] as const

export function GameLogSkeleton() {
  return (
    <LogSkeleton
      loading="Chargement du journal du jeu…"
      pillWidths={[]}
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
