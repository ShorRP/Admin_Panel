import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { ErrorNotice } from "./error-notice"

export const metadata: Metadata = { title: "Page introuvable" }

export default function NotFound() {
  return (
    <ErrorNotice
      title="Page introuvable"
      action={
        <a href="/" className={buttonVariants({ variant: "default" })}>
          <ArrowLeft aria-hidden data-icon="inline-start" />
          Revenir à l’accueil
        </a>
      }
    >
      Cette page n’existe pas.
    </ErrorNotice>
  )
}
