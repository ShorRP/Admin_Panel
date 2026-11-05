import { cn } from "cn"

import {
  FILTER_CONTROL_HEIGHT_CLASSES,
  FILTER_FORM_CLASSES,
} from "@/ui/filter-layout"
import { Skeleton } from "@/ui/skeleton"

export function FilterFormSkeleton({
  labelWidths,
  fieldClassName,
}: {
  labelWidths: readonly string[]
  fieldClassName: string
}) {
  return (
    <>
      <Skeleton
        className={cn(
          FILTER_CONTROL_HEIGHT_CLASSES,
          "w-full motion-reduce:animate-none md:hidden"
        )}
      />
      <div className={FILTER_FORM_CLASSES}>
        {labelWidths.map((width) => (
          <div key={width} className={fieldClassName}>
            <Skeleton
              className={cn("h-3.5 motion-reduce:animate-none", width)}
            />
            <Skeleton
              className={cn(
                FILTER_CONTROL_HEIGHT_CLASSES,
                "w-full motion-reduce:animate-none"
              )}
            />
          </div>
        ))}
        <Skeleton
          className={cn(
            FILTER_CONTROL_HEIGHT_CLASSES,
            "w-22 motion-reduce:animate-none"
          )}
        />
      </div>
    </>
  )
}
