import Form from "next/form"
import { ListFilter } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import type { AuditLogFilters } from "./audit-log-filters"
import { FILTER_FIELD_CLASSES, FILTER_FORM_CLASSES } from "./audit-log-layout"

export function AuditLogFilterForm({
  filters: { type, author, account },
}: {
  filters: AuditLogFilters
}) {
  return (
    <Form action="/audit-log" prefetch={false} className={FILTER_FORM_CLASSES}>
      {type !== null && <input type="hidden" name="type" value={type} />}
      <FilterField
        id="audit-log-author"
        name="author"
        label="Auteur"
        value={author}
      />
      <FilterField
        id="audit-log-account"
        name="account"
        label="Compte"
        value={account}
      />
      <Button type="submit">
        <ListFilter aria-hidden data-icon="inline-start" />
        Filtrer
      </Button>
    </Form>
  )
}

function FilterField({
  id,
  name,
  label,
  value,
}: {
  id: string
  name: string
  label: string
  value: string | null
}) {
  return (
    <div className={FILTER_FIELD_CLASSES}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        defaultValue={value ?? ""}
        placeholder="Nom, ID ou mention"
        autoComplete="off"
      />
    </div>
  )
}
