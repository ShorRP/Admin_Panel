import { Suspense, use, useId, ViewTransition, type ReactNode } from "react"
import Link from "next/link"
import { cn } from "cn"
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

const SECTION_LINK_CLASSES =
  "relative flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground"

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
    <>
      <aside className="sticky top-0 hidden h-svh w-63 shrink-0 flex-col border-r bg-sidebar text-sm text-sidebar-foreground md:flex">
        <PanelLink className="px-5.5 pt-6 pb-5.5" />
        <div
          aria-hidden
          className="flex items-center gap-2 px-5.5 text-ornament"
        >
          <span className="size-1.5 rotate-45 border border-current" />
          <span className="h-px flex-1 bg-border" />
        </div>
        <nav
          aria-label="Sections du panel"
          className="flex flex-1 flex-col gap-5.5 overflow-y-auto px-3 py-5"
        >
          <SectionGroup title="Administration">
            {sections.map((section) => (
              <SidebarSectionLink key={section.href} section={section} />
            ))}
          </SectionGroup>
          <Suspense fallback={null}>
            <ShownWhen shown={opensModeration}>
              <SectionGroup title="Modération">
                <SidebarSectionLink section={moderation} />
              </SectionGroup>
            </ShownWhen>
          </Suspense>
        </nav>
        <div className="flex items-center gap-2 border-t px-3 py-3.5">
          <div className="min-w-0 flex-1 py-0.5 pl-1.5">{member}</div>
          <LogOutForm iconOnly />
        </div>
      </aside>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-x-4 border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <PanelLink nameHidden />
        <div className="ml-auto flex min-w-0 items-center gap-2 **:data-[slot=staff-member-name]:hidden">
          {member}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu aria-hidden />
              <span className="sr-only">Ouvrir le menu</span>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-sidebar text-sidebar-foreground motion-reduce:translate-x-0!"
            >
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Sections du panel"
                className="flex flex-col gap-5.5 px-3"
              >
                <SectionGroup title="Administration">
                  {sections.map((section) => (
                    <MenuSectionLink key={section.href} section={section} />
                  ))}
                </SectionGroup>
                <Suspense fallback={null}>
                  <ShownWhen shown={opensModeration}>
                    <SectionGroup title="Modération">
                      <MenuSectionLink section={moderation} />
                    </SectionGroup>
                  </ShownWhen>
                </Suspense>
              </nav>
              <SheetFooter className="border-t">
                {member}
                <LogOutForm />
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
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

function PanelLink({
  className,
  nameHidden = false,
}: {
  className?: string
  nameHidden?: boolean
}) {
  return (
    <a href="/" className={cn("flex shrink-0 items-center gap-3", className)}>
      <ShorLogo />
      <span className={nameHidden ? "sr-only" : "flex flex-col gap-1.25"}>
        <span className="font-heading text-[1.1875rem] leading-none font-medium tracking-[0.24em] uppercase">
          Shor
        </span>{" "}
        <span className="text-[0.59375rem] leading-none font-medium tracking-[0.22em] whitespace-nowrap text-muted-foreground uppercase">
          Panel du staff
        </span>
      </span>
    </a>
  )
}

function SectionGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <div>
      <p
        id={titleId}
        className="px-2.5 pb-2 text-[0.625rem] leading-3.5 font-medium tracking-[0.18em] text-muted-foreground uppercase"
      >
        {title}
      </p>
      <ul aria-labelledby={titleId} className="flex flex-col gap-0.5">
        {children}
      </ul>
    </div>
  )
}

function SectionIcon({
  Icon,
  current,
}: {
  Icon: LucideIcon
  current: Section["current"]
}) {
  return (
    <Icon
      aria-hidden
      className={current === undefined ? "size-4" : "size-4 text-primary"}
    />
  )
}

function CurrentSectionBar() {
  return <span className="absolute inset-y-2.25 -left-3 w-0.5 bg-primary" />
}

function SidebarSectionLink({
  section: { href, name, Icon, current },
}: {
  section: Section
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        aria-current={current}
        className={SECTION_LINK_CLASSES}
      >
        <SectionIcon Icon={Icon} current={current} />
        {name}
        {current && (
          <ViewTransition
            name="current-section-bar"
            share="slide"
            default="none"
          >
            <CurrentSectionBar />
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
        className={SECTION_LINK_CLASSES}
      >
        <SectionIcon Icon={Icon} current={current} />
        {name}
        {current && <CurrentSectionBar />}
      </SheetClose>
    </li>
  )
}
