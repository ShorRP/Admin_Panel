import Form from "next/form"
import { cn } from "cn"
import { ListFilter, Search } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { FILTER_FORM_WIDTH_CLASSES } from "./blocked-word-list-layout"

const FIELD_ID = "blocked-word-filter"

export function BlockedWordFilterForm({ query }: { query: string | null }) {
  return (
    <Form
      action="/blocked-words"
      prefetch={false}
      className={cn("flex gap-2", FILTER_FORM_WIDTH_CLASSES)}
    >
      <Label htmlFor={FIELD_ID} className="sr-only">
        Filtrer la liste
      </Label>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.75 size-3.75 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={FIELD_ID}
          name="query"
          defaultValue={query ?? ""}
          placeholder="Filtrer la liste"
          autoComplete="off"
          className="pl-8.25"
        />
      </div>
      <Button type="submit">
        <ListFilter aria-hidden data-icon="inline-start" />
        Filtrer
      </Button>
    </Form>
  )
}
