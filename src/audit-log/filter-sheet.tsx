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

export type FilterSheetProps = {
  label: string
  action: string
  hiddenFields: { name: string; value: string }[]
  resetHref: string
  submitLabel: string
  children: ReactNode
}

const COUNT_CLASSES = cn(
  "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[0.6875rem] text-primary-foreground"
)

export function FilterSheet({
  activeCount,
  ...form
}: FilterSheetProps & { activeCount: number }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" className="w-full" />}>
        <SlidersHorizontal aria-hidden data-icon="inline-start" />
        {form.label}
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
      <SheetContent side="bottom" className="motion-reduce:translate-y-0!">
        <SheetHeader>
          <SheetTitle>{form.label}</SheetTitle>
        </SheetHeader>
        <FilterSheetForm {...form} />
      </SheetContent>
    </Sheet>
  )
}

export function FilterSheetForm({
  action,
  hiddenFields,
  resetHref,
  submitLabel,
  children,
}: Omit<FilterSheetProps, "label">) {
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
