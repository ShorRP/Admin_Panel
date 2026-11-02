import { Suspense, ViewTransition } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { AccountList } from "@/records/account-list"
import { AccountSearchForm } from "@/records/account-search-form"
import { AccountSearchFormSkeleton } from "@/records/account-search-form-skeleton"
import { FoundAccounts } from "@/records/found-accounts"
import { FoundAccountsSkeleton } from "@/records/found-accounts-skeleton"
import { listAccounts } from "@/records/list-accounts"
import { recordHref } from "@/records/record-href"
import { searchedText } from "@/records/search-accounts"
import { requireModerationAccess } from "@/staff/require-staff-member"
import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Modération" }

export default function RecordsPage({ searchParams }: PageProps<"/records">) {
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="mx-auto flex max-w-270 flex-col gap-7">
        <PageHeader
          overline="Fiches des comptes"
          title="Modération"
          className="max-w-160"
        >
          Cherche un compte par le début de son nom d’utilisateur ou de son
          pseudo sur le serveur, ou ouvre sa fiche par son ID ou sa mention.
        </PageHeader>
        <OrnamentRule leadingLine />
        <div className="flex max-w-190 flex-col gap-7">
          <Suspense fallback={<AccountSearchFormSkeleton />}>
            <AccountSearchFormWithQuery searchParams={searchParams} />
          </Suspense>
          <SuspenseWithSkeleton skeleton={<FoundAccountsSkeleton />}>
            <AccountsFromDiscord searchParams={searchParams} />
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

async function AccountsFromDiscord({
  searchParams,
}: Pick<PageProps<"/records">, "searchParams">) {
  await connection()
  const discord = createDiscordApi()
  await requireModerationAccess(discord)
  const { query, page } = await searchParams
  const list = await listAccounts(discord, { query, page })
  if (list.kind === "record") {
    redirect(recordHref(list.userId))
  }
  return list.kind === "page" ? (
    <AccountList list={list} />
  ) : (
    <FoundAccounts search={list} />
  )
}
