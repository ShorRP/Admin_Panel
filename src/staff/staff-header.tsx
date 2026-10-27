import type { ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/ui/button"
import { logOut } from "./actions"
import { ShorLogo } from "./shor-logo"

const SECTIONS = [
  { href: "/blocked-words", name: "Mots interdits" },
  { href: "/audit-log", name: "Journal d’audit" },
] as const

export function StaffHeader({
  currentPath,
  memberName,
}: {
  currentPath: string
  memberName: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-2">
      <a href="/" className="flex items-center gap-2 font-medium">
        <ShorLogo />
        Panel de Shor
      </a>
      <nav aria-label="Sections du panel">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {SECTIONS.map(({ href, name }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={href === currentPath ? "page" : undefined}
                className="underline-offset-4 hover:underline aria-[current=page]:font-medium aria-[current=page]:underline"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 sm:ml-auto">
        <p className="wrap-anywhere">{memberName}</p>
        <form action={logOut}>
          <Button type="submit" variant="ghost">
            Se déconnecter
          </Button>
        </form>
      </div>
    </header>
  )
}
