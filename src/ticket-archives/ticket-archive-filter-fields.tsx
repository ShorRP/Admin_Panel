import type { FilterChip } from "@/ui/filter-chips"
import { FILTER_CONTROL_HEIGHT_CLASSES } from "@/ui/filter-layout"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { NativeSelect, NativeSelectOption } from "@/ui/native-select"
import type { TicketArchiveFilters } from "./ticket-archive-filters"
import { ticketArchivesHref } from "./ticket-archives-href"

type FieldName = Exclude<keyof TicketArchiveFilters, "kind">

type Choice = { value: string; label: string }

type Field =
  | { name: FieldName; label: string; type: "text"; placeholder: string }
  | { name: FieldName; label: string; type: "day" }
  | { name: FieldName; label: string; type: "choice"; choices: Choice[] }

const FIELDS: Field[] = [
  {
    name: "opener",
    label: "Ouvreur",
    type: "text",
    placeholder: "Nom, ID ou mention",
  },
  {
    name: "closer",
    label: "Fermeur",
    type: "text",
    placeholder: "Nom, ID ou mention",
  },
  {
    name: "reason",
    label: "Motif",
    type: "text",
    placeholder: "Mots du motif",
  },
  { name: "from", label: "Du", type: "day" },
  { name: "to", label: "Au", type: "day" },
  {
    name: "on",
    label: "Période sur",
    type: "choice",
    choices: [
      { value: "", label: "La fermeture" },
      { value: "opened", label: "L’ouverture" },
    ],
  },
  {
    name: "sort",
    label: "Ordre",
    type: "choice",
    choices: [
      { value: "", label: "Plus récentes d’abord" },
      { value: "oldest", label: "Plus anciennes d’abord" },
    ],
  },
]

const DAY = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "UTC",
})

export function TicketArchiveFilterFields({
  filters,
  idPrefix,
  className,
}: {
  filters: TicketArchiveFilters
  idPrefix: string
  className: string
}) {
  return FIELDS.map((field) => {
    const id = `${idPrefix}-${field.name}`
    const value = filters[field.name] ?? ""
    return (
      <div key={field.name} className={className}>
        <Label htmlFor={id}>{field.label}</Label>
        {field.type === "choice" ? (
          <NativeSelect
            id={id}
            name={field.name}
            defaultValue={value}
            className="w-full"
          >
            {field.choices.map((choice) => (
              <NativeSelectOption key={choice.value} value={choice.value}>
                {choice.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <Input
            id={id}
            name={field.name}
            type={field.type === "day" ? "date" : "text"}
            defaultValue={value}
            className={FILTER_CONTROL_HEIGHT_CLASSES}
            {...(field.type === "text"
              ? { placeholder: field.placeholder, autoComplete: "off" }
              : {})}
          />
        )}
      </div>
    )
  })
}

export function ticketArchiveChipsOf(filters: TicketArchiveFilters) {
  return FIELDS.flatMap((field): FilterChip[] => {
    const value = filters[field.name]
    if (value === null) {
      return []
    }
    const text =
      field.type === "day"
        ? DAY.format(new Date(value))
        : field.type === "choice"
          ? (field.choices.find((choice) => choice.value === value)?.label ??
            value)
          : value
    return [
      {
        name: field.label,
        value: text,
        href: ticketArchivesHref({ ...filters, [field.name]: null }, 1),
      },
    ]
  })
}
