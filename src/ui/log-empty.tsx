import { EmptyListFrame } from "@/ui/empty-list-frame"
import { TextLink } from "@/ui/text-link"

export function LogEmpty({
  message,
  resetHref,
}: {
  message: string
  resetHref: string | null
}) {
  return (
    <EmptyListFrame className="flex flex-col items-center gap-3">
      <p>{message}</p>
      {resetHref !== null && (
        <TextLink href={resetHref} className="text-[0.8125rem]">
          Réinitialiser
        </TextLink>
      )}
    </EmptyListFrame>
  )
}
