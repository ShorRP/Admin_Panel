import { Suspense, ViewTransition } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { AccountSearchForm } from "@/records/account-search-form"
import { AccountSearchFormSkeleton } from "@/records/account-search-form-skeleton"
import { FoundAccounts } from "@/records/found-accounts"
import { FoundAccountsSkeleton } from "@/records/found-accounts-skeleton"
import { searchAccounts, searchedText } from "@/records/search-accounts"
import { requireModerationAccess } from "@/staff/require-staff-member"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Modération" }

export default function RecordsPage({ searchParams }: PageProps<"/records">) {
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="flex flex-col gap-7">
        <div className="flex max-w-160 flex-col gap-2.5">
          <p className="text-[0.65625rem] leading-3.5 font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Fiches des comptes
          </p>
          <h1 className="font-heading text-[2.375rem] leading-[1.05] font-medium tracking-[-0.01em]">
            Modération
          </h1>
          <p className="text-[0.9375rem] leading-5.5 text-pretty text-muted-foreground">
            Cherche un compte par le début de son nom d’utilisateur ou de son
            pseudo sur le serveur, ou ouvre sa fiche par son ID ou sa mention.
          </p>
        </div>
        <div aria-hidden className="flex items-center gap-2 text-ornament">
          <span className="h-px w-6 bg-current" />
          <span className="size-1.5 rotate-45 border border-current" />
          <span className="h-px flex-1 bg-border" />
        </div>
        <Suspense fallback={<AccountSearchFormSkeleton />}>
          <AccountSearchFormWithQuery searchParams={searchParams} />
        </Suspense>
        <SuspenseWithSkeleton skeleton={<FoundAccountsSkeleton />}>
          <FoundAccountsFromDiscord searchParams={searchParams} />
        </SuspenseWithSkeleton>
      </main>
    </ViewTransition>
  )
}

async function AccountSearchFormWithQuery({
  searchParams,
}: Pick<PageProps<"/records">, "searchParams">) {
  const { query } = await searchParams
  return <AccountSearchForm query={searchedText(query)} />
}

async function FoundAccountsFromDiscord({
  searchParams,
}: Pick<PageProps<"/records">, "searchParams">) {
  await connection()
  const discord = createDiscordApi()
  await requireModerationAccess(discord)
  const { query } = await searchParams
  const search = await searchAccounts(discord, query)
  if (search.kind === "record") {
    redirect(`/records/${search.userId}`)
  }
  return <FoundAccounts search={search} />
}
