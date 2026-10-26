import type { Metadata } from "next"

import { LoginRefused } from "@/staff/login-refused"

export const metadata: Metadata = { title: "Accès refusé" }

export default function LoginRefusedPage() {
  return <LoginRefused />
}
