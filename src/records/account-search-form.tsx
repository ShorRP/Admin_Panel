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
      <div className="flex flex-wrap gap-2">
        <Input
          id={FIELD_ID}
          name="query"
          defaultValue={query}
          autoComplete="off"
          className="max-w-xs flex-1"
        />
        <Button type="submit">
          <Search aria-hidden data-icon="inline-start" />
          Chercher
        </Button>
      </div>
    </Form>
  )
}
