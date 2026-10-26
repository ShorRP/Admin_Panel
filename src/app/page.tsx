import { Suspense } from "react"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { requireStaffMember } from "@/staff/require-staff-member"

export default function Home() {
  return (
    <main>
      <h1>Panel d’administration de Shor</h1>
      <Suspense fallback={<p role="status">Vérification de l’accès…</p>}>
        <StaffHome />
      </Suspense>
    </main>
  )
}

async function StaffHome() {
  await connection()
  await requireStaffMember(createDiscordApi())
  return <p>Le staff de Shor y administre le serveur Discord.</p>
}
