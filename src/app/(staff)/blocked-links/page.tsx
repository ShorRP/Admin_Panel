import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { AllowedDomains } from "@/link-rule/allowed-domains-section"
import { ExemptChannels } from "@/link-rule/exempt-channels-section"
import { ExemptRoles } from "@/link-rule/exempt-roles-section"
import { LinkRuleActionSection } from "@/link-rule/link-rule-action-section"
import {
  AllowedDomainsSkeleton,
  LinkRuleSideSectionSkeleton,
  LinkRuleSwitchSkeleton,
} from "@/link-rule/link-rule-skeletons"
import { LinkRuleSwitchCard } from "@/link-rule/link-rule-switch-card"
import { LinkRuleView } from "@/link-rule/link-rule-view"
import { OtherExceptions } from "@/link-rule/other-exceptions-section"
import { readLinkRule, type LinkRuleSettings } from "@/link-rule/read-link-rule"
import { StatefulLinkRuleSwitchForm } from "@/link-rule/stateful-link-rule-switch-form"
import { requireStaffMember } from "@/staff/require-staff-member"
import type { StaffMember } from "@/staff/staff-member"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Liens" }

export default function BlockedLinksPage() {
  const linkRule = linkRuleFromDiscord(staffMemberFromDiscord())
  return (
    <ViewTransition
      enter="section-crossfade"
      exit="section-crossfade"
      default="none"
    >
      <main>
        <LinkRuleView
          switchCard={
            <SuspenseWithSkeleton skeleton={<LinkRuleSwitchSkeleton />}>
              <SwitchFromDiscord linkRule={linkRule} />
            </SuspenseWithSkeleton>
          }
          domains={
            <SuspenseWithSkeleton skeleton={<AllowedDomainsSkeleton />}>
              <DomainsFromDiscord linkRule={linkRule} />
            </SuspenseWithSkeleton>
          }
          roles={
            <SuspenseWithSkeleton
              skeleton={
                <LinkRuleSideSectionSkeleton loading="Chargement des rôles exemptés…" />
              }
            >
              <RolesFromDiscord linkRule={linkRule} />
            </SuspenseWithSkeleton>
          }
          channels={
            <SuspenseWithSkeleton
              skeleton={
                <LinkRuleSideSectionSkeleton loading="Chargement des salons exemptés…" />
              }
            >
              <ChannelsFromDiscord linkRule={linkRule} />
            </SuspenseWithSkeleton>
          }
          action={
            <SuspenseWithSkeleton
              skeleton={
                <LinkRuleSideSectionSkeleton loading="Chargement de l’action…" />
              }
            >
              <ActionFromDiscord linkRule={linkRule} />
            </SuspenseWithSkeleton>
          }
          otherExceptions={
            <SuspenseWithSkeleton skeleton={null}>
              <OtherExceptionsFromDiscord linkRule={linkRule} />
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

async function linkRuleFromDiscord(staffMember: Promise<StaffMember>) {
  const member = await staffMember
  return await readLinkRule(createDiscordApi(), member)
}

type FromDiscordProps = { linkRule: Promise<LinkRuleSettings> }

async function SwitchFromDiscord({ linkRule }: FromDiscordProps) {
  const { status } = await linkRule
  return (
    <LinkRuleSwitchCard
      status={status}
      form={<StatefulLinkRuleSwitchForm status={status} />}
    />
  )
}

async function DomainsFromDiscord({ linkRule }: FromDiscordProps) {
  const { allowedDomains } = await linkRule
  return <AllowedDomains domains={allowedDomains} />
}

async function RolesFromDiscord({ linkRule }: FromDiscordProps) {
  const { exemptRoles } = await linkRule
  return <ExemptRoles roles={exemptRoles} />
}

async function ChannelsFromDiscord({ linkRule }: FromDiscordProps) {
  const { exemptChannels } = await linkRule
  return <ExemptChannels channels={exemptChannels} />
}

async function ActionFromDiscord({ linkRule }: FromDiscordProps) {
  const { action } = await linkRule
  return <LinkRuleActionSection action={action} />
}

async function OtherExceptionsFromDiscord({ linkRule }: FromDiscordProps) {
  const { otherExceptions } = await linkRule
  return <OtherExceptions entries={otherExceptions} />
}
