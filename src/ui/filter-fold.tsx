import { FilterChips, type FilterChip } from "@/ui/filter-chips"
import { FILTER_FOLD_CLASSES } from "@/ui/filter-layout"
import { FilterSheet, type FilterSheetFormProps } from "@/ui/filter-sheet"

export function FilterFold({
  label,
  chips,
  ...form
}: FilterSheetFormProps & {
  label: string
  chips: FilterChip[]
}) {
  return (
    <div className={FILTER_FOLD_CLASSES}>
      <FilterSheet label={label} activeCount={chips.length} {...form} />
      <FilterChips chips={chips} />
    </div>
  )
}
