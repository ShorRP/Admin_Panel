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
      <main className="mx-auto flex max-w-xl flex-col gap-6 p-4">
        <h1 className="font-heading text-xl font-medium">Modération</h1>
        <p>
          Cherche un compte par le début de son nom d’utilisateur ou de son
          pseudo sur le serveur, ou ouvre sa fiche par son ID ou sa mention.
        </p>
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
