import type { ReactNode } from "react"
import { cn } from "cn"
import { ShieldBan, Timer } from "lucide-react"

const LOOKS = {
  timeout: {
    Icon: Timer,
    box: cn("border-warning/40 bg-warning/6"),
    icon: cn("text-warning"),
  },
  ban: {
    Icon: ShieldBan,
    box: cn("border-destructive/40 bg-destructive/10"),
    icon: cn("text-destructive"),
  },
}

export function SanctionNotice({
  kind,
  title,
  detail,
  children,
}: {
  kind: keyof typeof LOOKS
  title: string
  detail: ReactNode
  children?: ReactNode
}) {
  const { Icon, box, icon } = LOOKS[kind]
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-lg border px-3.5 py-3", box)}
    >
      <div className="flex items-start gap-2.5">
        <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", icon)} />
        <p className="flex flex-col gap-0.5">
          <span className="font-medium">{title}</span>
          <span className="text-[0.8125rem]">{detail}</span>
        </p>
      </div>
      {children}
    </div>
  )
}
