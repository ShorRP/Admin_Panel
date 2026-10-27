import { Suspense } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { OtherAutoModRules } from "@/blocked-words/other-auto-mod-rules"
import { readBlockedWords } from "@/blocked-words/read-blocked-words"
import { StatefulAddBlockedWordForm } from "@/blocked-words/stateful-add-blocked-word-form"
import { StatefulBlockedWordList } from "@/blocked-words/stateful-blocked-word-list"
import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"

export const metadata: Metadata = { title: "Mots interdits" }

export default function BlockedWordsPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-4">
      <h1 className="text-xl font-medium">Mots interdits</h1>
      <p>
        Les mots interdits ne s’appliquent ni au propriétaire du serveur
        Discord, ni aux membres qui ont la permission « Administrateur » ou
        « Gérer le serveur ».
      </p>
      <StatefulAddBlockedWordForm />
      <Suspense fallback={<p role="status">Chargement des mots interdits…</p>}>
        <BlockedWordsFromDiscord />
      </Suspense>
    </main>
  )
}

async function BlockedWordsFromDiscord() {
  await connection()
  const discord = createDiscordApi()
  await requireStaffMember(discord)
  const { words, otherRules } = await readBlockedWords(discord)
  return (
    <>
      <StatefulBlockedWordList words={words} />
      <OtherAutoModRules rules={otherRules} />
    </>
  )
}
