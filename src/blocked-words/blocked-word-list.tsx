import { ViewTransition } from "react"
import { X } from "lucide-react"

import { Button } from "@/ui/button"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { counted, quoted } from "./french-text"
import type { WriteResult } from "./write-result"

const HEADING_ID = "blocked-word-list"

export function BlockedWordList({
  words,
  state,
  pending,
  action,
}: {
  words: string[]
  state: WriteResult | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2
          id={HEADING_ID}
          className="font-heading text-[1.375rem] leading-[1.2] font-medium"
        >
          La liste
        </h2>
        {words.length > 0 && (
          <p className="text-[0.8125rem] text-muted-foreground">
            {counted(words.length, "mot interdit", "mots interdits")}
          </p>
        )}
      </div>
      {words.length === 0 && (
        <p className="mt-3.5 rounded-xl border border-dashed border-input px-5 py-7 text-center text-muted-foreground">
          Aucun mot interdit pour l’instant.
        </p>
      )}
      <ul className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-2 empty:hidden">
        {words.map((word) => (
          <ViewTransition
            key={word}
            enter="highlight-enter"
            exit="fade-exit"
            update="slide-into-place"
            default="none"
          >
            <li
              title={word}
              className="flex h-10 min-w-0 items-center gap-1.5 rounded-lg border bg-card pr-1 pl-3"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[0.78125rem]">
                {word}
              </span>
              <form action={action} className="flex">
                <input type="hidden" name="word" value={word} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  className="text-muted-foreground"
                >
                  <X aria-hidden className="size-3.75" />
                  <span className="sr-only">{`Retirer ${quoted(word)}`}</span>
                </Button>
              </form>
            </li>
          </ViewTransition>
        ))}
      </ul>
      <p role="status" className="text-sm not-empty:mt-3.5">
        {pending && "Retrait en cours…"}
      </p>
      <p role="alert" className="text-sm not-empty:mt-3.5">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </section>
  )
}
