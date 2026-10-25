import type { Metadata } from "next"

import { LoggedOut } from "@/staff/logged-out"

export const metadata: Metadata = { title: "Déconnexion" }

export default function LoggedOutPage() {
  return <LoggedOut />
}
