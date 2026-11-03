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
  "flex h-7 items-center justify-center gap-1.5 rounded-sm border border-transparent text-xs whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs touch:h-11",
  {
    variants: {
      layout: {
        labelled: "flex-1 px-2",
        icons: "w-7 touch:w-11",
        rail: "flex-1 px-2 max-lg:w-11 max-lg:flex-none max-lg:px-0",
      },
    },
  }
)

export function ThemeToggle({
  theme,
  onChoose,
  iconOnly = false,
  rail = false,
  className,
}: {
  theme: Theme
  onChoose: (theme: Theme) => void
  iconOnly?: boolean
  rail?: boolean
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Thème"
      className={cn(
        "flex gap-0.5 rounded-md bg-muted p-0.5",
        rail && "max-lg:flex-col",
        className
      )}
    >
      {CHOICES.map(({ theme: choice, name, Icon }) => (
        <button
          key={choice}
          type="button"
          aria-pressed={theme === choice}
          onClick={() => onChoose(choice)}
          className={choiceVariants({
            layout: iconOnly ? "icons" : rail ? "rail" : "labelled",
          })}
        >
          {iconOnly ? (
            <>
              <Icon aria-hidden className="size-3.5" />
              <span className="sr-only">{name}</span>
            </>
          ) : (
            <>
              <Icon aria-hidden data-icon="inline-start" className="size-3.5" />
              {rail ? <span className="max-lg:sr-only">{name}</span> : name}
            </>
          )}
        </button>
      ))}
    </div>
  )
}
