import { ViewTransition, type ReactNode } from "react"
import Link from "next/link"
import { Ban, Menu, ScrollText } from "lucide-react"

import { Button } from "@/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/sheet"
import { LogOutForm } from "./log-out-form"
import { ShorLogo } from "./shor-logo"

const SECTIONS = [
  { href: "/blocked-words", name: "Mots interdits", Icon: Ban },
  { href: "/audit-log", name: "Journal d’audit", Icon: ScrollText },
] as const

export function StaffHeader({
  currentPath,
  memberName,
}: {
  currentPath: string
  memberName: ReactNode
}) {
  const sections = SECTIONS.map((section) => ({
    ...section,
    current: section.href === currentPath ? ("page" as const) : undefined,
  }))
  return (
    <header className="flex min-h-14 items-center gap-x-6 border-b px-4">
      <a
        href="/"
        className="flex shrink-0 items-center gap-2 font-heading font-medium whitespace-nowrap"
      >
        <ShorLogo />
        <span className="max-md:sr-only">Panel de Shor</span>
      </a>
      <nav
        aria-label="Sections du panel"
        className="hidden shrink-0 self-stretch md:flex"
      >
        <ul className="flex gap-x-4">
          {sections.map(({ href, name, Icon, current }) => (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={current}
                className="relative flex items-center gap-1.5 px-1 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
              >
                <Icon aria-hidden className="size-4" />
                {name}
                {current && (
                  <ViewTransition
                    name="current-section-underline"
                    share="slide"
                    default="none"
                  >
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                  </ViewTransition>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="ml-auto hidden min-w-0 items-center gap-2 md:flex">
        <div className="wrap-anywhere">{memberName}</div>
        <LogOutForm />
      </div>
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" />
          }
        >
          <Menu aria-hidden />
          <span className="sr-only">Ouvrir le menu</span>
        </SheetTrigger>
        <SheetContent side="right" className="motion-reduce:translate-x-0!">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav aria-label="Sections du panel">
            <ul className="flex flex-col">
              {sections.map(({ href, name, Icon, current }) => (
                <li key={href}>
                  <SheetClose
                    nativeButton={false}
                    role={undefined}
                    render={<Link href={href} aria-current={current} />}
                    className="flex items-center gap-2 border-l-2 border-transparent px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                  >
                    <Icon aria-hidden className="size-4" />
                    {name}
                  </SheetClose>
                </li>
              ))}
            </ul>
          </nav>
          <SheetFooter className="border-t">
            <div className="wrap-anywhere">{memberName}</div>
            <LogOutForm />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  )
}
