import type { ReactNode } from "react"
import Form from "next/form"
import { ListFilter } from "lucide-react"

import { Button } from "@/ui/button"
import { FILTER_FORM_CLASSES } from "@/ui/filter-layout"
import { HiddenFields, type HiddenField } from "@/ui/hidden-fields"

export function FilterForm({
  action,
  hiddenFields,
  submitLabel,
  children,
}: {
  action: string
  hiddenFields: HiddenField[]
  submitLabel: string
  children: ReactNode
}) {
  return (
    <Form action={action} prefetch={false} className={FILTER_FORM_CLASSES}>
      <HiddenFields fields={hiddenFields} />
      {children}
      <Button type="submit">
        <ListFilter aria-hidden data-icon="inline-start" />
        {submitLabel}
      </Button>
    </Form>
  )
}
