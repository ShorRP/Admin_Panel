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

import { AccountLink } from "@/ui/account-link"
import { Button } from "@/ui/button"
import { OrnamentRule } from "@/ui/ornament-rule"
import { Overline } from "@/ui/overline"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/sheet"
import { Skeleton } from "@/ui/skeleton"
import { LogOutForm } from "./log-out-form"
import { PrivacyPolicyLink } from "./privacy-policy-link"
import { ShorLogo } from "./shor-logo"
import { staffRoleLabel } from "./staff-role-label"
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

type MemberRecord = { href: string; name: string }

const MEMBER_LINK_CLASSES = cn(
  "block min-w-0 rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground touch:flex touch:min-h-11 touch:items-center"
)

const MEMBER_LINK_PLACE_CLASSES = {
  sidebar: cn("max-lg:size-11 max-lg:justify-center"),
  bar: cn("min-w-11 justify-center"),
}

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
  "group/section relative flex items-center gap-2.5 rounded-sm px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground",
  {
    variants: {
      place: {
        sidebar:
          "h-9 max-lg:size-11 max-lg:justify-center max-lg:px-0 touch:h-11",
        menu: "h-11",
      },
    },
  }
)

const panelNameVariants = cva("", {
  variants: {
    nameVisibility: {
      never: "sr-only",
      fromLg: "flex flex-col gap-1.25 max-lg:sr-only",
    },
  },
})

const currentSectionBarVariants = cva(
  "absolute inset-y-2.25 w-0.5 bg-primary",
  {
    variants: {
      place: { sidebar: "-left-3 max-lg:-left-2.5", menu: "-left-3" },
    },
  }
)

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
  ownRecord: Promise<MemberRecord | null>
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
      <aside
        data-slot="sidebar"
        className="sticky top-0 hidden h-svh shrink-0 flex-col overflow-y-auto border-r bg-sidebar pl-[env(safe-area-inset-left)] text-sm text-sidebar-foreground md:flex md:w-[calc(4rem+env(safe-area-inset-left))] lg:w-[calc(15.75rem+env(safe-area-inset-left))]"
      >
        <PanelLink
          nameVisibility="fromLg"
          className="px-5.5 pt-6 pb-5.5 max-lg:justify-center max-lg:px-0"
        />
        <OrnamentRule className="px-5.5 max-lg:hidden" />
        <RailOrnament />
        <SectionNav
          place="sidebar"
          sections={sections}
          moderation={moderation}
          opensModeration={opensModeration}
          SectionLink={SidebarSectionLink}
          className="flex flex-1 flex-col gap-5.5 overflow-y-auto px-3 py-5 max-lg:gap-3 max-lg:overflow-visible max-lg:py-4 max-lg:pr-2 max-lg:pl-2.5"
        />
        <div className="flex flex-col gap-3 border-t px-3 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] max-lg:items-center max-lg:px-0">
          <StatefulThemeToggle rail />
          <div className="flex items-center gap-2 max-lg:flex-col">
            <div className="min-w-0 flex-1 py-0.5 pl-1.5 max-lg:flex-none max-lg:p-0 max-lg:**:data-[slot=staff-member-name]:sr-only">
              <MemberLink place="sidebar" {...linkTo}>
                {member}
              </MemberLink>
              <MemberRole
                opensModeration={opensModeration}
                className="max-lg:sr-only"
              />
            </div>
            <LogOutForm iconOnly />
          </div>
          <PrivacyPolicyLink
            rail
            className="ml-1.5 self-start max-lg:ml-0 max-lg:self-center touch:flex touch:min-h-11 touch:items-center"
          />
        </div>
      </aside>
      <header
        data-slot="bar"
        className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-x-4 border-b bg-sidebar pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] text-sidebar-foreground md:hidden"
      >
        <PanelLink
          nameVisibility="never"
          className="-ml-2 min-h-11 min-w-11 justify-center"
        />
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
              <SheetBody className="flex flex-col gap-4 px-0">
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
                  <div className="min-w-0">
                    <MemberLink place="menu" {...linkTo}>
                      {member}
                    </MemberLink>
                    <MemberRole opensModeration={opensModeration} />
                  </div>
                  <LogOutForm />
                  <SheetClose
                    nativeButton={false}
                    role={undefined}
                    render={
                      <PrivacyPolicyLink className="self-start touch:flex touch:min-h-11 touch:items-center" />
                    }
                  />
                </SheetFooter>
              </SheetBody>
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
  ownRecord: Promise<MemberRecord | null>
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
  ownRecord: Promise<MemberRecord | null>
  children: ReactNode
}) {
  const record = use(ownRecord)
  if (record === null) {
    return children
  }
  const current = currentPath === record.href ? "page" : undefined
  if (place === "menu") {
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
  return (
    <AccountLink
      href={record.href}
      current={current}
      className={cn(MEMBER_LINK_CLASSES, MEMBER_LINK_PLACE_CLASSES[place])}
    >
      {place === "bar" && <span className="sr-only">{record.name}</span>}
      {children}
    </AccountLink>
  )
}

function MemberRole({
  opensModeration,
  className,
}: {
  opensModeration: Promise<boolean>
  className?: string
}) {
  return (
    <div className={cn("pl-10.5 text-xs text-muted-foreground", className)}>
      <Suspense
        fallback={
          <Skeleton className="my-0.5 h-3 w-16 motion-reduce:animate-none" />
        }
      >
        <RoleName opensModeration={opensModeration} />
      </Suspense>
    </div>
  )
}

function RoleName({ opensModeration }: { opensModeration: Promise<boolean> }) {
  return staffRoleLabel(use(opensModeration))
}

function PanelLink({
  className,
  nameVisibility,
}: {
  className?: string
  nameVisibility: "never" | "fromLg"
}) {
  return (
    <a href="/" className={cn("flex shrink-0 items-center gap-3", className)}>
      <ShorLogo />
      <span className={panelNameVariants({ nameVisibility })}>
        <span className="font-heading text-[1.1875rem] leading-none font-medium tracking-[0.24em] uppercase">
          Shor
        </span>{" "}
        <span className="text-[0.6875rem] leading-none font-medium tracking-[0.22em] whitespace-nowrap text-muted-foreground uppercase">
          Panel du staff
        </span>
      </span>
    </a>
  )
}

function RailOrnament() {
  return (
    <div
      aria-hidden
      className="mx-auto flex w-8 items-center gap-1 text-ornament lg:hidden"
    >
      <span className="h-px flex-1 bg-border" />
      <span className="size-1.5 rotate-45 border border-current" />
      <span className="h-px flex-1 bg-border" />
    </div>
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
      <SectionGroup
        id={`${place}-administration`}
        title="Administration"
        place={place}
      >
        {sections.map((section) => (
          <SectionLink key={section.href} section={section} />
        ))}
      </SectionGroup>
      <Suspense fallback={null}>
        <ShownWhen shown={opensModeration}>
          <SectionGroup
            id={`${place}-moderation`}
            title="Modération"
            place={place}
            ruled
          >
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
  place,
  ruled = false,
  children,
}: {
  id: string
  title: string
  place: "sidebar" | "menu"
  ruled?: boolean
  children: ReactNode
}) {
  return (
    <div>
      {ruled && place === "sidebar" && (
        <span
          aria-hidden
          className="mx-auto mb-3 block h-px w-6 bg-border lg:hidden"
        />
      )}
      <Overline
        id={id}
        className={cn("px-2.5 pb-2", place === "sidebar" && "max-lg:sr-only")}
      >
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

function CurrentSectionBar({ place }: { place: "sidebar" | "menu" }) {
  return <span className={currentSectionBarVariants({ place })} />
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
        title={name}
        aria-current={current}
        className={sectionLinkVariants({ place: "sidebar" })}
      >
        <SectionIcon Icon={Icon} />
        <span className="max-lg:sr-only">{name}</span>
        {badge}
        {current && (
          <ViewTransition
            name="current-section-bar"
            share="slide"
            default="none"
          >
            <CurrentSectionBar place="sidebar" />
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
        className={sectionLinkVariants({ place: "menu" })}
      >
        <SectionIcon Icon={Icon} />
        {name}
        {badge}
        {current && <CurrentSectionBar place="menu" />}
      </SheetClose>
    </li>
  )
}
