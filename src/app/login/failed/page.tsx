import type { Metadata } from "next"

import { LoginFailed } from "@/staff/login-failed"

export const metadata: Metadata = { title: "Connexion échouée" }

export default function LoginFailedPage() {
  return <LoginFailed />
}
