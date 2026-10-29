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
import { OrnamentRule } from "@/ui/ornament-rule"
import { Overline } from "@/ui/overline"
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
          <Overline>Fiches des comptes</Overline>
          <h1 className="font-heading text-[2.375rem] leading-[1.05] font-medium tracking-[-0.01em]">
            Modération
          </h1>
          <p className="text-[0.9375rem] leading-5.5 text-pretty text-muted-foreground">
            Cherche un compte par le début de son nom d’utilisateur ou de son
            pseudo sur le serveur, ou ouvre sa fiche par son ID ou sa mention.
          </p>
        </div>
        <OrnamentRule leadingLine />
        <div className="flex max-w-190 flex-col gap-7">
          <Suspense fallback={<AccountSearchFormSkeleton />}>
            <AccountSearchFormWithQuery searchParams={searchParams} />
          </Suspense>
          <SuspenseWithSkeleton skeleton={<FoundAccountsSkeleton />}>
            <FoundAccountsFromDiscord searchParams={searchParams} />
          </SuspenseWithSkeleton>
        </div>
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
