import { Suspense, use, ViewTransition, type ReactNode } from "react"
import Link from "next/link"
import { Ban, Gavel, Menu, ScrollText, type LucideIcon } from "lucide-react"

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

type Section = {
  href: string
  name: string
  Icon: LucideIcon
  current: "page" | undefined
}

const SECTIONS = [
  { href: "/blocked-words", name: "Mots interdits", Icon: Ban },
  { href: "/audit-log", name: "Journal d’audit", Icon: ScrollText },
] as const

const MODERATION = { href: "/records", name: "Modération", Icon: Gavel }

export function StaffHeader({
  currentPath,
  member,
  opensModeration,
}: {
  currentPath: string
  member: ReactNode
  opensModeration: Promise<boolean>
}) {
  const sections = SECTIONS.map((section) => withCurrent(section, currentPath))
  const moderation = withCurrent(MODERATION, currentPath)
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
          {sections.map((section) => (
            <BarSectionLink key={section.href} section={section} />
          ))}
          <Suspense fallback={null}>
            <ShownWhen shown={opensModeration}>
              <BarSectionLink section={moderation} />
            </ShownWhen>
          </Suspense>
        </ul>
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2 max-md:**:data-[slot=staff-member-name]:hidden">
        {member}
        <LogOutForm className="max-md:hidden" />
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" />
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
                {sections.map((section) => (
                  <MenuSectionLink key={section.href} section={section} />
                ))}
                <Suspense fallback={null}>
                  <ShownWhen shown={opensModeration}>
                    <MenuSectionLink section={moderation} />
                  </ShownWhen>
                </Suspense>
              </ul>
            </nav>
            <SheetFooter className="border-t">
              {member}
              <LogOutForm />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

function withCurrent(
  section: Omit<Section, "current">,
  currentPath: string
): Section {
  return {
    ...section,
    current:
      currentPath === section.href || currentPath.startsWith(`${section.href}/`)
        ? "page"
        : undefined,
  }
}

function ShownWhen({
  shown,
  children,
}: {
  shown: Promise<boolean>
  children: ReactNode
}) {
  return use(shown) ? children : null
}

function BarSectionLink({
  section: { href, name, Icon, current },
}: {
  section: Section
}) {
  return (
    <li className="flex">
      <Link
        href={href}
        prefetch={false}
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
  )
}

function MenuSectionLink({
  section: { href, name, Icon, current },
}: {
  section: Section
}) {
  return (
    <li>
      <SheetClose
        nativeButton={false}
        role={undefined}
        render={<Link href={href} prefetch={false} aria-current={current} />}
        className="flex items-center gap-2 border-l-2 border-transparent px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:font-medium aria-[current=page]:text-foreground"
      >
        <Icon aria-hidden className="size-4" />
        {name}
      </SheetClose>
    </li>
  )
}
