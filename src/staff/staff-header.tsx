import {
  Suspense,
  use,
  ViewTransition,
  type ComponentType,
  type ReactNode,
} from "react"
import Link from "next/link"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Ban, Gavel, Menu, ScrollText, type LucideIcon } from "lucide-react"

import { Button } from "@/ui/button"
import { OrnamentRule } from "@/ui/ornament-rule"
import { Overline } from "@/ui/overline"
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
import type { OwnRecord } from "./staff-member"
import { StatefulThemeToggle } from "./stateful-theme-toggle"

type Section = {
  href: string
  name: string
  Icon: LucideIcon
  badge?: ReactNode
  current: "page" | undefined
}

type SectionLinkComponent = ComponentType<{ section: Section }>

type MemberPlace = "sidebar" | "bar" | "menu"

const MEMBER_LINK_CLASSES =
  "block min-w-0 rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground"

const BLOCKED_WORDS = {
  href: "/blocked-words",
  name: "Mots interdits",
  Icon: Ban,
}

const AUDIT_LOG = {
  href: "/audit-log",
  name: "Journal d’audit",
  Icon: ScrollText,
}

const MODERATION = { href: "/records", name: "Modération", Icon: Gavel }

const sectionLinkVariants = cva(
  "group/section relative flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground"
)

const panelNameVariants = cva("", {
  variants: {
    shown: { true: "flex flex-col gap-1.25", false: "sr-only" },
  },
})

export function StaffHeader({
  currentPath,
  member,
  opensModeration,
  ownRecord,
  blockedWordCount,
}: {
  currentPath: string
  member: ReactNode
  opensModeration: Promise<boolean>
  ownRecord: Promise<OwnRecord | null>
  blockedWordCount: ReactNode
}) {
  const linkTo = { currentPath, ownRecord }
  const sections = [
    withCurrent({ ...BLOCKED_WORDS, badge: blockedWordCount }, currentPath),
    withCurrent(AUDIT_LOG, currentPath),
  ]
  const moderation = withCurrent(MODERATION, currentPath)
  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-63 shrink-0 flex-col border-r bg-sidebar text-sm text-sidebar-foreground md:flex">
        <PanelLink className="px-5.5 pt-6 pb-5.5" />
        <OrnamentRule className="px-5.5" />
        <SectionNav
          place="sidebar"
          sections={sections}
          moderation={moderation}
          opensModeration={opensModeration}
          SectionLink={SidebarSectionLink}
          className="flex flex-1 flex-col gap-5.5 overflow-y-auto px-3 py-5"
        />
        <div className="flex flex-col gap-3 border-t px-3 py-3.5">
          <StatefulThemeToggle />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 py-0.5 pl-1.5">
              <MemberLink place="sidebar" {...linkTo}>
                {member}
              </MemberLink>
            </div>
            <LogOutForm iconOnly />
          </div>
        </div>
      </aside>
      <header className="flex h-14 items-center gap-x-4 border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <PanelLink nameShown={false} />
        <div className="ml-auto flex min-w-0 items-center gap-2 **:data-[slot=staff-member-name]:hidden">
          <MemberLink place="bar" {...linkTo}>
            {member}
          </MemberLink>
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
              <SectionNav
                place="menu"
                sections={sections}
                moderation={moderation}
                opensModeration={opensModeration}
                SectionLink={MenuSectionLink}
                className="flex flex-col gap-5.5 px-3"
              />
              <SheetFooter className="border-t">
                <StatefulThemeToggle />
                <MemberLink place="menu" {...linkTo}>
                  {member}
                </MemberLink>
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

function MemberLink({
  place,
  currentPath,
  ownRecord,
  children,
}: {
  place: MemberPlace
  currentPath: string
  ownRecord: Promise<OwnRecord | null>
  children: ReactNode
}) {
  return (
    <Suspense fallback={children}>
      <LinkedToOwnRecord
        place={place}
        currentPath={currentPath}
        ownRecord={ownRecord}
      >
        {children}
      </LinkedToOwnRecord>
    </Suspense>
  )
}

function LinkedToOwnRecord({
  place,
  currentPath,
  ownRecord,
  children,
}: {
  place: MemberPlace
  currentPath: string
  ownRecord: Promise<OwnRecord | null>
  children: ReactNode
}) {
  const record = use(ownRecord)
  if (record === null) {
    return children
  }
  const current = currentPath === record.href ? "page" : undefined
  if (place === "sidebar") {
    return (
      <Link
        href={record.href}
        prefetch={false}
        aria-current={current}
        className={MEMBER_LINK_CLASSES}
      >
        {children}
      </Link>
    )
  }
  if (place === "bar") {
    return (
      <Link
        href={record.href}
        prefetch={false}
        aria-current={current}
        className={MEMBER_LINK_CLASSES}
      >
        <span className="sr-only">{record.name}</span>
        {children}
      </Link>
    )
  }
  return (
    <SheetClose
      nativeButton={false}
      role={undefined}
      render={
        <Link href={record.href} prefetch={false} aria-current={current} />
      }
      className={MEMBER_LINK_CLASSES}
    >
      {children}
    </SheetClose>
  )
}

function PanelLink({
  className,
  nameShown = true,
}: {
  className?: string
  nameShown?: boolean
}) {
  return (
    <a href="/" className={cn("flex shrink-0 items-center gap-3", className)}>
      <ShorLogo />
      <span className={panelNameVariants({ shown: nameShown })}>
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

function SectionNav({
  place,
  sections,
  moderation,
  opensModeration,
  SectionLink,
  className,
}: {
  place: "sidebar" | "menu"
  sections: Section[]
  moderation: Section
  opensModeration: Promise<boolean>
  SectionLink: SectionLinkComponent
  className: string
}) {
  return (
    <nav aria-label="Sections du panel" className={className}>
      <SectionGroup id={`${place}-administration`} title="Administration">
        {sections.map((section) => (
          <SectionLink key={section.href} section={section} />
        ))}
      </SectionGroup>
      <Suspense fallback={null}>
        <ShownWhen shown={opensModeration}>
          <SectionGroup id={`${place}-moderation`} title="Modération">
            <SectionLink section={moderation} />
          </SectionGroup>
        </ShownWhen>
      </Suspense>
    </nav>
  )
}

function SectionGroup({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <Overline id={id} className="px-2.5 pb-2 text-[0.625rem] leading-3.5">
        {title}
      </Overline>
      <ul aria-labelledby={id} className="flex flex-col gap-0.5">
        {children}
      </ul>
    </div>
  )
}

function SectionIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <Icon
      aria-hidden
      className="size-4 group-aria-[current=page]/section:text-primary"
    />
  )
}

function CurrentSectionBar() {
  return <span className="absolute inset-y-2.25 -left-3 w-0.5 bg-primary" />
}

function SidebarSectionLink({
  section: { href, name, Icon, badge, current },
}: {
  section: Section
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        aria-current={current}
        className={sectionLinkVariants()}
      >
        <SectionIcon Icon={Icon} />
        {name}
        {badge}
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
  section: { href, name, Icon, badge, current },
}: {
  section: Section
}) {
  return (
    <li>
      <SheetClose
        nativeButton={false}
        role={undefined}
        render={<Link href={href} prefetch={false} aria-current={current} />}
        className={sectionLinkVariants()}
      >
        <SectionIcon Icon={Icon} />
        {name}
        {badge}
        {current && <CurrentSectionBar />}
      </SheetClose>
    </li>
  )
}
