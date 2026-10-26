import type { ReactNode } from "react"

export function LoginNotice({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-medium">{title}</h1>
      {children}
    </main>
  )
}
