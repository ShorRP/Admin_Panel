import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { BlockedWordCapacity } from "@/blocked-words/blocked-word-capacity"
import { BlockedWordCapacitySkeleton } from "@/blocked-words/blocked-word-capacity-skeleton"
import { BlockedWordExceptions } from "@/blocked-words/blocked-word-exceptions"
import { BlockedWordListSkeleton } from "@/blocked-words/blocked-word-list-skeleton"
import { OtherAutoModRules } from "@/blocked-words/other-auto-mod-rules"
import {
  readBlockedWords,
  type BlockedWords,
} from "@/blocked-words/read-blocked-words"
import { StatefulAddBlockedWordForm } from "@/blocked-words/stateful-add-blocked-word-form"
import { StatefulBlockedWordList } from "@/blocked-words/stateful-blocked-word-list"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"
import { OrnamentRule } from "@/ui/ornament-rule"
import { Overline } from "@/ui/overline"
import { PageHeading } from "@/ui/page-heading"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Mots interdits" }

export default function BlockedWordsPage() {
  const blockedWords = blockedWordsFromDiscord()
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main className="flex max-w-270 flex-col gap-7">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex max-w-155 flex-col gap-2.5">
            <Overline>AutoMod · Règle du panel</Overline>
            <PageHeading>Mots interdits</PageHeading>
            <p className="text-[0.9375rem] leading-5.5 text-pretty text-muted-foreground">
              Les messages qui contiennent l’un de ces mots ou expressions sont
              bloqués par Discord avant d’être publiés.
            </p>
          </div>
          <SuspenseWithSkeleton skeleton={<BlockedWordCapacitySkeleton />}>
            <CapacityOf blockedWords={blockedWords} />
          </SuspenseWithSkeleton>
        </div>
        <OrnamentRule leadingLine />
        <div className="@container">
          <div className="grid gap-x-10 gap-y-7 @min-[48.75rem]:grid-cols-[minmax(28.75rem,1fr)_minmax(17.5rem,22.5rem)]">
            <div className="flex min-w-0 flex-col gap-7">
              <StatefulAddBlockedWordForm />
              <SuspenseWithSkeleton skeleton={<BlockedWordListSkeleton />}>
                <ListOf blockedWords={blockedWords} />
              </SuspenseWithSkeleton>
            </div>
            <div className="flex min-w-0 flex-col gap-7 @min-[48.75rem]:sticky @min-[48.75rem]:top-6 @min-[48.75rem]:self-start">
              <BlockedWordExceptions />
              <SuspenseWithSkeleton skeleton={null}>
                <OtherRulesOf blockedWords={blockedWords} />
              </SuspenseWithSkeleton>
            </div>
          </div>
        </div>
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

type BlockedWordsProps = { blockedWords: Promise<BlockedWords> }

async function CapacityOf({ blockedWords }: BlockedWordsProps) {
  const { words } = await blockedWords
  return <BlockedWordCapacity count={words.length} />
}

async function ListOf({ blockedWords }: BlockedWordsProps) {
  const { words } = await blockedWords
  return <StatefulBlockedWordList words={words} />
}

async function OtherRulesOf({ blockedWords }: BlockedWordsProps) {
  const { otherRules } = await blockedWords
  return <OtherAutoModRules rules={otherRules} />
}
