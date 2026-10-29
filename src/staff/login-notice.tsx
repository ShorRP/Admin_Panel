import type { ReactNode } from "react"

import { StatefulThemeToggle } from "./stateful-theme-toggle"

export function LoginNotice({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <StatefulThemeToggle iconOnly className="self-end" />
      <h1 className="font-heading text-xl font-medium">{title}</h1>
      {children}
    </main>
  )
}
