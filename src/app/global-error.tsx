"use client"

import { APPLY_STORED_THEME } from "@/ui/theme"
import ErrorPage from "./error"

import "@/ui/globals.css"

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>Page indisponible – Panel de Shor</title>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <script>{APPLY_STORED_THEME}</script>
      </head>
      <body>
        <ErrorPage error={error} retry={retry} />
      </body>
    </html>
  )
}
