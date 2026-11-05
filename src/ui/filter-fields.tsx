import type { FilterChip } from "@/ui/filter-chips"
import { FILTER_CONTROL_HEIGHT_CLASSES } from "@/ui/filter-layout"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"

export type FilterFieldSpec<Name extends string = string> = {
  name: Name
  label: string
} & ({ type: "text"; placeholder: string } | { type: "day" })

const DAY = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "UTC",
})

export const PERIOD_FIELDS: readonly [
  FilterFieldSpec<"from">,
  FilterFieldSpec<"to">,
] = [
  { name: "from", label: "Du", type: "day" },
  { name: "to", label: "Au", type: "day" },
]

export function searchTextField(placeholder: string): FilterFieldSpec<"text"> {
  return { name: "text", label: "Texte", type: "text", placeholder }
}

export function formatDay(day: string) {
  return DAY.format(new Date(day))
}

export function FilterFields<Name extends string>({
  fields,
  values,
  idPrefix,
  className,
}: {
  fields: readonly FilterFieldSpec<Name>[]
  values: Readonly<Record<Name, string | null>>
  idPrefix: string
  className: string
}) {
  return fields.map((field) => {
    const id = `${idPrefix}-${field.name}`
    return (
      <div key={field.name} className={className}>
        <Label htmlFor={id}>{field.label}</Label>
        <Input
          id={id}
          name={field.name}
          type={field.type === "day" ? "date" : "text"}
          defaultValue={values[field.name] ?? ""}
          className={FILTER_CONTROL_HEIGHT_CLASSES}
          {...(field.type === "text"
            ? { placeholder: field.placeholder, autoComplete: "off" }
            : {})}
        />
      </div>
    )
  })
}

export function filterChipsOf<Name extends string>(
  fields: readonly FilterFieldSpec<Name>[],
  values: Readonly<Record<Name, string | null>>,
  hrefWithout: (name: Name) => string
): FilterChip[] {
  return fields.flatMap((field): FilterChip[] => {
    const value = values[field.name]
    return value === null
      ? []
      : [
          {
            name: field.label,
            value: field.type === "day" ? formatDay(value) : value,
            href: hrefWithout(field.name),
          },
        ]
  })
}
