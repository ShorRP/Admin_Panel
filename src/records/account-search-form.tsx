import Form from "next/form"
import { Search } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"

const FIELD_ID = "account-search"

export function AccountSearchForm({ query }: { query: string }) {
  return (
    <Form action="/records" prefetch={false} className="flex flex-col gap-2">
      <Label htmlFor={FIELD_ID}>Compte</Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={FIELD_ID}
            name="query"
            defaultValue={query}
            placeholder="Nom d’utilisateur, pseudo, ID ou mention"
            autoComplete="off"
            className="h-11 pl-10.5"
          />
        </div>
        <Button
          type="submit"
          className="h-11 px-4.5 has-data-[icon=inline-start]:pl-4"
        >
          <Search aria-hidden data-icon="inline-start" />
          Chercher
        </Button>
      </div>
    </Form>
  )
}
