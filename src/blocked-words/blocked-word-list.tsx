import { ViewTransition } from "react"
import { X } from "lucide-react"

import { Button } from "@/ui/button"
import { counted, frenchNumber } from "./french-text"
import { MAX_BLOCKED_WORDS } from "./limits"
import type { WriteResult } from "./write-result"
import { WriteResultMessage } from "./write-result-message"

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
    <div className="flex flex-col gap-2">
      {words.length === 0 ? (
        <p>Aucun mot interdit pour l’instant.</p>
      ) : (
        <p>
          {counted(words.length, "mot interdit", "mots interdits")} sur{" "}
          {frenchNumber(MAX_BLOCKED_WORDS)} possibles.
        </p>
      )}
      <ul className="flex flex-col gap-1 empty:hidden">
        {words.map((word) => (
          <ViewTransition
            key={word}
            enter="highlight-enter"
            exit="fade-exit"
            update="slide-into-place"
            default="none"
          >
            <li className="flex items-center justify-between gap-2">
              <span className="min-w-0 wrap-anywhere">{word}</span>
              <form action={action}>
                <input type="hidden" name="word" value={word} />
                <Button type="submit" variant="outline" disabled={pending}>
                  <X aria-hidden data-icon="inline-start" />
                  Retirer
                </Button>
              </form>
            </li>
          </ViewTransition>
        ))}
      </ul>
      <p role="status" className="text-sm">
        {pending
          ? "Retrait en cours…"
          : state?.ok === true && <WriteResultMessage result={state} />}
      </p>
      <p role="alert" className="text-sm">
        {state?.ok === false && <WriteResultMessage result={state} />}
      </p>
    </div>
  )
}
