import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { BlockedWordCapacity } from "@/blocked-words/blocked-word-capacity"
import { BlockedWordCapacitySkeleton } from "@/blocked-words/blocked-word-capacity-skeleton"
import { BlockedWordListSkeleton } from "@/blocked-words/blocked-word-list-skeleton"
import { BlockedWordsView } from "@/blocked-words/blocked-words-view"
import { filterBlockedWords } from "@/blocked-words/filter-blocked-words"
import { OtherAutoModRules } from "@/blocked-words/other-auto-mod-rules"
import {
  readBlockedWords,
  type BlockedWords,
} from "@/blocked-words/read-blocked-words"
import { StatefulAddBlockedWordForm } from "@/blocked-words/stateful-add-blocked-word-form"
import { StatefulBlockedWordList } from "@/blocked-words/stateful-blocked-word-list"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Mots interdits" }

export default function BlockedWordsPage({
  searchParams,
}: PageProps<"/blocked-words">) {
  const blockedWords = blockedWordsFromDiscord()
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main>
        <BlockedWordsView
          capacity={
            <SuspenseWithSkeleton skeleton={<BlockedWordCapacitySkeleton />}>
              <CapacityFromDiscord blockedWords={blockedWords} />
            </SuspenseWithSkeleton>
          }
          form={<StatefulAddBlockedWordForm />}
          list={
            <SuspenseWithSkeleton skeleton={<BlockedWordListSkeleton />}>
              <ListFromDiscord
                blockedWords={blockedWords}
                searchParams={searchParams}
              />
            </SuspenseWithSkeleton>
          }
          otherRules={
            <SuspenseWithSkeleton skeleton={null}>
              <OtherRulesFromDiscord blockedWords={blockedWords} />
            </SuspenseWithSkeleton>
          }
        />
      </main>
    </ViewTransition>
  )
}

async function blockedWordsFromDiscord() {
  await connection()
  const discord = createDiscordApi()
  await requireStaffMember(discord)
  return await readBlockedWords(discord)
}

type FromDiscordProps = { blockedWords: Promise<BlockedWords> }

async function CapacityFromDiscord({ blockedWords }: FromDiscordProps) {
  const { words } = await blockedWords
  return <BlockedWordCapacity count={words.length} />
}

async function ListFromDiscord({
  blockedWords,
  searchParams,
}: FromDiscordProps & Pick<PageProps<"/blocked-words">, "searchParams">) {
  const [{ words }, { query }] = await Promise.all([blockedWords, searchParams])
  return (
    <StatefulBlockedWordList blockedWords={filterBlockedWords(words, query)} />
  )
}

async function OtherRulesFromDiscord({ blockedWords }: FromDiscordProps) {
  const { otherRules } = await blockedWords
  return <OtherAutoModRules rules={otherRules} />
}
