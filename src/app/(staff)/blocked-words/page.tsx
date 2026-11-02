import { Suspense, ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { AddBlockedWordFormSkeleton } from "@/blocked-words/add-blocked-word-form-skeleton"
import { allowedActionIds, rightsOf } from "@/blocked-words/blocked-word-action"
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
import type { StaffMember } from "@/staff/staff-member"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Mots interdits" }

export default function BlockedWordsPage({
  searchParams,
}: PageProps<"/blocked-words">) {
  const staffMember = staffMemberFromDiscord()
  const blockedWords = blockedWordsFromDiscord(staffMember)
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
          form={
            <Suspense fallback={<AddBlockedWordFormSkeleton />}>
              <FormForStaffMember staffMember={staffMember} />
            </Suspense>
          }
          list={
            <SuspenseWithSkeleton skeleton={<BlockedWordListSkeleton />}>
              <ListFromDiscord
                blockedWords={blockedWords}
                staffMember={staffMember}
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

async function staffMemberFromDiscord() {
  await connection()
  return await requireStaffMember(createDiscordApi())
}

async function blockedWordsFromDiscord(staffMember: Promise<StaffMember>) {
  await staffMember
  return await readBlockedWords(createDiscordApi())
}

type FromDiscordProps = { blockedWords: Promise<BlockedWords> }

type StaffMemberProps = { staffMember: Promise<StaffMember> }

async function FormForStaffMember({ staffMember }: StaffMemberProps) {
  return (
    <StatefulAddBlockedWordForm actions={allowedActionIds(await staffMember)} />
  )
}

async function CapacityFromDiscord({ blockedWords }: FromDiscordProps) {
  const { words } = await blockedWords
  return <BlockedWordCapacity count={words.length} />
}

async function ListFromDiscord({
  blockedWords,
  staffMember,
  searchParams,
}: FromDiscordProps &
  StaffMemberProps &
  Pick<PageProps<"/blocked-words">, "searchParams">) {
  const [{ words }, member, { query }] = await Promise.all([
    blockedWords,
    staffMember,
    searchParams,
  ])
  return (
    <StatefulBlockedWordList
      blockedWords={filterBlockedWords(words, query)}
      rights={rightsOf(member)}
    />
  )
}

async function OtherRulesFromDiscord({ blockedWords }: FromDiscordProps) {
  const { otherRules } = await blockedWords
  return <OtherAutoModRules rules={otherRules} />
}
