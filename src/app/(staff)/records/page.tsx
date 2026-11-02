import { Suspense, ViewTransition } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import type { APIRole } from "discord-api-types/v10"

import { createDiscordApi, type DiscordApi } from "@/discord/discord-api"
import { AccountList } from "@/records/account-list"
import { accountListFormOf } from "@/records/account-list-filters"
import { AccountSearchForm } from "@/records/account-search-form"
import { AccountSearchFormSkeleton } from "@/records/account-search-form-skeleton"
import { FoundAccountsSkeleton } from "@/records/found-accounts-skeleton"
import { listAccounts } from "@/records/list-accounts"
import { recordHref } from "@/records/record-href"
import { requireModerationAccess } from "@/staff/require-staff-member"
import { OrnamentRule } from "@/ui/ornament-rule"
import { PageHeader } from "@/ui/page-header"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Modération" }

export default function RecordsPage({ searchParams }: PageProps<"/records">) {
  const discord = moderatedDiscord()
  const roles = rolesFromDiscord(discord)
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
          Parcours les comptes du serveur Discord, membres et bannis. Cherche
          par le début du nom d’utilisateur, du nom global ou du pseudo, filtre
          par rôle, état, arrivée ou âge du compte, affiche les comptes de bot,
          trie la liste, ou ouvre une fiche avec son ID ou sa mention.
        </PageHeader>
        <OrnamentRule leadingLine />
        <div className="flex max-w-190 flex-col gap-7">
          <Suspense fallback={<AccountSearchFormSkeleton />}>
            <AccountSearchFormFromDiscord
              discord={discord}
              roles={roles}
              searchParams={searchParams}
            />
          </Suspense>
          <SuspenseWithSkeleton skeleton={<FoundAccountsSkeleton />}>
            <AccountsFromDiscord
              discord={discord}
              roles={roles}
              searchParams={searchParams}
            />
          </SuspenseWithSkeleton>
        </div>
      </main>
    </ViewTransition>
  )
}

type FromDiscordProps = {
  discord: Promise<DiscordApi>
  roles: Promise<APIRole[]>
} & Pick<PageProps<"/records">, "searchParams">

async function moderatedDiscord() {
  await connection()
  const discord = createDiscordApi()
  await requireModerationAccess(discord)
  return discord
}

async function rolesFromDiscord(discord: Promise<DiscordApi>) {
  return await (await discord).listRoles()
}

async function AccountSearchFormFromDiscord({
  discord,
  roles,
  searchParams,
}: FromDiscordProps) {
  const [api, roleList, params] = await Promise.all([
    discord,
    roles,
    searchParams,
  ])
  const form = accountListFormOf(params, roleList, api.guildId)
  return <AccountSearchForm filters={form.filters} roles={form.roles} />
}

async function AccountsFromDiscord({
  discord,
  roles,
  searchParams,
}: FromDiscordProps) {
  const [api, params] = await Promise.all([discord, searchParams])
  const list = await listAccounts(api, params, roles)
  if (list.kind === "record") {
    redirect(recordHref(list.userId))
  }
  return <AccountList list={list} />
}
