import type { ReactNode } from "react"
import Form from "next/form"
import Link from "next/link"
import { cn } from "cn"
import { ListFilter, SlidersHorizontal } from "lucide-react"

import { Button, buttonVariants } from "@/ui/button"
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

export type FilterSheetFormProps = {
  action: string
  hiddenFields: { name: string; value: string }[]
  resetHref: string
  submitLabel: string
  children: ReactNode
}

export type FilterSheetProps = FilterSheetFormProps & {
  label: string
  activeCount: number
  triggerClassName?: string
  rightFromSm?: boolean
}

const COUNT_CLASSES = cn(
  "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[0.6875rem] text-primary-foreground"
)

const REDUCED_MOTION_CLASSES = cn(
  "motion-reduce:translate-x-0! motion-reduce:translate-y-0!"
)

const RIGHT_FROM_SM_CLASSES = cn(
  "sm:top-0! sm:left-auto! sm:h-full! sm:max-h-none! sm:w-3/4 sm:max-w-sm sm:border-t-0! sm:border-l! sm:data-ending-style:translate-x-[2.5rem] sm:data-ending-style:translate-y-0! sm:data-starting-style:translate-x-[2.5rem] sm:data-starting-style:translate-y-0!"
)

export function FilterSheet({
  label,
  activeCount,
  triggerClassName,
  rightFromSm,
  ...form
}: FilterSheetProps) {
  return (
    <Sheet>
      <FilterSheetTrigger
        label={label}
        activeCount={activeCount}
        className={triggerClassName}
      />
      <FilterSheetContent label={label} rightFromSm={rightFromSm}>
        <FilterSheetForm {...form} />
      </FilterSheetContent>
    </Sheet>
  )
}

export function FilterSheetTrigger({
  label,
  activeCount,
  className,
}: {
  label: string
  activeCount: number
  className?: string | undefined
}) {
  return (
    <SheetTrigger
      render={<Button variant="outline" className={cn("w-full", className)} />}
    >
      <SlidersHorizontal aria-hidden data-icon="inline-start" />
      {label}
      {activeCount > 0 && (
        <>
          <span aria-hidden className={COUNT_CLASSES}>
            {activeCount}
          </span>
          <span className="sr-only">
            {activeCount}{" "}
            {activeCount === 1 ? "filtre actif" : "filtres actifs"}
          </span>
        </>
      )}
    </SheetTrigger>
  )
}

export function FilterSheetContent({
  label,
  rightFromSm = false,
  children,
}: {
  label: string
  rightFromSm?: boolean | undefined
  children: ReactNode
}) {
  return (
    <SheetContent
      side="bottom"
      className={cn(
        REDUCED_MOTION_CLASSES,
        rightFromSm && RIGHT_FROM_SM_CLASSES
      )}
    >
      <SheetHeader>
        <SheetTitle>{label}</SheetTitle>
      </SheetHeader>
      {children}
    </SheetContent>
  )
}

export function FilterSheetForm({
  action,
  hiddenFields,
  resetHref,
  submitLabel,
  children,
}: FilterSheetFormProps) {
  return (
    <Form
      action={action}
      prefetch={false}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      {hiddenFields.map(({ name, value }) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SheetBody className="flex flex-col gap-4">{children}</SheetBody>
      <SheetFooter className="grid grid-cols-2 gap-2">
        <SheetClose
          nativeButton={false}
          role="link"
          render={
            <Link
              href={resetHref}
              prefetch={false}
              className={buttonVariants({ variant: "outline" })}
            />
          }
        >
          Réinitialiser
        </SheetClose>
        <SheetClose type="submit" render={<Button />}>
          <ListFilter aria-hidden data-icon="inline-start" />
          {submitLabel}
        </SheetClose>
      </SheetFooter>
    </Form>
  )
}
