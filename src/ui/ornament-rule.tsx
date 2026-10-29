import { cn } from "cn"

export function OrnamentRule({
  leadingLine = false,
  className,
}: {
  leadingLine?: boolean
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn("flex items-center gap-2 text-ornament", className)}
    >
      {leadingLine && <span className="h-px w-6 bg-current" />}
      <span className="size-1.5 rotate-45 border border-current" />
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
