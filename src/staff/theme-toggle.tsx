import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Monitor, Moon, Sun } from "lucide-react"

import type { Theme } from "@/ui/theme"

const CHOICES = [
  { theme: "system", name: "Auto", Icon: Monitor },
  { theme: "light", name: "Clair", Icon: Sun },
  { theme: "dark", name: "Sombre", Icon: Moon },
] as const

const choiceVariants = cva(
  "flex h-7 items-center justify-center gap-1.5 rounded-sm text-xs whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs",
  {
    variants: {
      iconOnly: { true: "w-7", false: "flex-1 px-2" },
    },
  }
)

export function ThemeToggle({
  theme,
  onChoose,
  iconOnly = false,
  className,
}: {
  theme: Theme
  onChoose: (theme: Theme) => void
  iconOnly?: boolean
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Thème"
      className={cn("flex gap-0.5 rounded-md bg-muted p-0.5", className)}
    >
      {CHOICES.map(({ theme: choice, name, Icon }) => (
        <button
          key={choice}
          type="button"
          aria-pressed={theme === choice}
          onClick={() => onChoose(choice)}
          className={choiceVariants({ iconOnly })}
        >
          <Icon aria-hidden className="size-3.5" />
          {iconOnly ? <span className="sr-only">{name}</span> : name}
        </button>
      ))}
    </div>
  )
}
