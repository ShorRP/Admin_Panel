import { cn } from "cn"
import { CircleAlert, CircleCheck } from "lucide-react"

type WriteResult = { ok: boolean; message: string }

export function WriteResultMessage({ result }: { result: WriteResult }) {
  const Icon = result.ok ? CircleCheck : CircleAlert
  return (
    <span
      key={result.message}
      className={cn(
        "flex animate-in gap-1.5 duration-200 ease-out fade-in motion-safe:slide-in-from-top-1",
        result.ok ? "text-success" : "text-destructive"
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {result.message}
    </span>
  )
}
