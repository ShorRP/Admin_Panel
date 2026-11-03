import type { ReactNode } from "react"
import type { Metadata, Viewport } from "next"

import { APPLY_STORED_THEME } from "@/ui/theme"

import "@/ui/globals.css"

export const metadata: Metadata = {
  title: {
    template: "%s – Panel de Shor",
    default: "Panel d’administration de Shor",
  },
  description: "Le panel où le staff de Shor administre le serveur Discord.",
}

export const viewport: Viewport = { viewportFit: "cover" }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script>{APPLY_STORED_THEME}</script>
      </head>
      <body>{children}</body>
    </html>
  )
}
