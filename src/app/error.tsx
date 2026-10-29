"use client"

import { RotateCcw } from "lucide-react"

import { Button } from "@/ui/button"
import { ReportChannelLink } from "@/ui/report-channel-link"
import { ErrorNotice } from "./error-notice"

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  const reference =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : undefined
  return (
    <ErrorNotice
      title="Page indisponible"
      action={
        <Button type="button" onClick={() => retry()}>
          <RotateCcw aria-hidden data-icon="inline-start" />
          Réessayer
        </Button>
      }
    >
      Le panel n’a pas pu afficher cette page. Discord ne répond peut-être pas :
      réessaie dans un instant. Si ça continue, signale-le dans{" "}
      <ReportChannelLink />
      {reference === undefined ? (
        "."
      ) : (
        <>
          {" "}
          avec la référence <span className="font-mono">{reference}</span>.
        </>
      )}
    </ErrorNotice>
  )
}
