import { CircleAlert } from "lucide-react"

export function WriteFailureMessage({ message }: { message: string }) {
  return (
    <span
      key={message}
      className="flex animate-in gap-1.5 text-destructive duration-200 ease-out fade-in motion-safe:slide-in-from-top-1"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </span>
  )
}
