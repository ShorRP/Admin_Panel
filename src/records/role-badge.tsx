import { cn } from "cn"

import { BADGE_CLASSES } from "./badge-classes"
import type { HighestRole } from "./role-hierarchy"

export function RoleBadge({
  role: { name, color },
  className,
}: {
  role: HighestRole
  className?: string
}) {
  return (
    <span className={cn(BADGE_CLASSES, "max-w-full", className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          color === null && "bg-muted-foreground"
        )}
        style={color === null ? undefined : { backgroundColor: color }}
      />
      <span className="min-w-0 wrap-anywhere">{name}</span>
    </span>
  )
}
