import type { Metadata } from "next"

import { PrivacyPolicy } from "@/privacy-policy/privacy-policy"

export const metadata: Metadata = { title: "Politique de confidentialité" }

export default function PrivacyPage() {
  return <PrivacyPolicy />
}
