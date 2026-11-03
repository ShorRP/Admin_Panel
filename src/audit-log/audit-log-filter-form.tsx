import Form from "next/form"
import { ListFilter } from "lucide-react"

import { Button } from "@/ui/button"
import { AuditLogFilterField } from "./audit-log-filter-field"
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
      <AuditLogFilterField
        id="audit-log-author"
        name="author"
        label="Auteur"
        value={author}
        className={FILTER_FIELD_CLASSES}
      />
      <AuditLogFilterField
        id="audit-log-account"
        name="account"
        label="Compte"
        value={account}
        className={FILTER_FIELD_CLASSES}
      />
      <Button type="submit">
        <ListFilter aria-hidden data-icon="inline-start" />
        Filtrer
      </Button>
    </Form>
  )
}
