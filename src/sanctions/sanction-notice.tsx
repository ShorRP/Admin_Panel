import type { ReactNode } from "react"
import { cva } from "class-variance-authority"
import type { LucideIcon } from "lucide-react"

const noticeBox = cva("flex flex-col gap-3 rounded-lg border px-3.5 py-3", {
  variants: {
    kind: {
      timeout: "border-warning/40 bg-warning/6",
      ban: "border-destructive/40 bg-destructive/10",
    },
  },
})

const noticeIcon = cva("mt-0.5 size-4 shrink-0", {
  variants: {
    kind: {
      timeout: "text-warning",
      ban: "text-destructive",
    },
  },
})

export function SanctionNotice({
  kind,
  icon: Icon,
  title,
  detail,
  children,
}: {
  kind: "timeout" | "ban"
  icon: LucideIcon
  title: string
  detail: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={noticeBox({ kind })}>
      <div className="flex items-start gap-2.5">
        <Icon aria-hidden className={noticeIcon({ kind })} />
        <p className="flex flex-col gap-0.5">
          <span className="font-medium">{title}</span>
          <span className="text-[0.8125rem]">{detail}</span>
        </p>
      </div>
      {children}
    </div>
  )
}
