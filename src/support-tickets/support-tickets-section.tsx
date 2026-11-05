import type { ReactNode } from "react"

export function SupportTicketsSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5">
      <h2
        id={id}
        className="font-heading text-[1.375rem] leading-[1.2] font-medium"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
