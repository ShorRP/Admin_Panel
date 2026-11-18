import { ViewTransition } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"

import { createDiscordApi } from "@/discord/discord-api"
import { AllowedDomainsSection } from "@/link-rule/allowed-domains-section"
import { AllowedDomainsSkeleton } from "@/link-rule/allowed-domains-skeleton"
import { ExemptChannelsSection } from "@/link-rule/exempt-channels-section"
import { ExemptChannelsSkeleton } from "@/link-rule/exempt-channels-skeleton"
import { ExemptRolesSection } from "@/link-rule/exempt-roles-section"
import { ExemptRolesSkeleton } from "@/link-rule/exempt-roles-skeleton"
import { actionChoicesOf } from "@/link-rule/link-rule-action"
import { LinkRuleActionSection } from "@/link-rule/link-rule-action-section"
import { LinkRuleActionSkeleton } from "@/link-rule/link-rule-action-skeleton"
import { LinkRuleSwitchCard } from "@/link-rule/link-rule-switch-card"
import { LinkRuleSwitchSkeleton } from "@/link-rule/link-rule-switch-skeleton"
import { LinkRuleView } from "@/link-rule/link-rule-view"
import { OtherExceptionsSection } from "@/link-rule/other-exceptions-section"
import { readLinkRule, type LinkRuleSettings } from "@/link-rule/read-link-rule"
import { StatefulAddAllowedDomainForm } from "@/link-rule/stateful-add-allowed-domain-form"
import { StatefulAddExemptChannelForm } from "@/link-rule/stateful-add-exempt-channel-form"
import { StatefulAddExemptRoleForm } from "@/link-rule/stateful-add-exempt-role-form"
import { StatefulAllowedDomainList } from "@/link-rule/stateful-allowed-domain-list"
import { StatefulChangeLinkRuleActionForm } from "@/link-rule/stateful-change-link-rule-action-form"
import { StatefulExemptChannelList } from "@/link-rule/stateful-exempt-channel-list"
import { StatefulExemptRoleList } from "@/link-rule/stateful-exempt-role-list"
import { StatefulLinkRuleSwitchForm } from "@/link-rule/stateful-link-rule-switch-form"
import { requireStaffMember } from "@/staff/require-staff-member"
import type { StaffMember } from "@/staff/staff-member"
import { SuspenseWithSkeleton } from "@/ui/suspense-with-skeleton"

export const metadata: Metadata = { title: "Liens" }

export default function BlockedLinksPage() {
  const staffMember = staffMemberFromDiscord()
  const linkRule = linkRuleFromDiscord(staffMember)
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
            <SuspenseWithSkeleton skeleton={<ExemptRolesSkeleton />}>
              <RolesFromDiscord linkRule={linkRule} />
            </SuspenseWithSkeleton>
          }
          channels={
            <SuspenseWithSkeleton skeleton={<ExemptChannelsSkeleton />}>
              <ChannelsFromDiscord linkRule={linkRule} />
            </SuspenseWithSkeleton>
          }
          action={
            <SuspenseWithSkeleton skeleton={<LinkRuleActionSkeleton />}>
              <ActionFromDiscord
                linkRule={linkRule}
                staffMember={staffMember}
              />
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
  const { allowedDomains, status } = await linkRule
  return (
    <AllowedDomainsSection
      domains={allowedDomains}
      form={<StatefulAddAllowedDomainForm />}
      list={
        <StatefulAllowedDomainList
          domains={allowedDomains}
          removable={status !== "absent"}
        />
      }
    />
  )
}

async function RolesFromDiscord({ linkRule }: FromDiscordProps) {
  const { exemptRoles, exemptableRoles, staffRoleId } = await linkRule
  return (
    <ExemptRolesSection
      roles={exemptRoles}
      staffRoleId={staffRoleId}
      form={<StatefulAddExemptRoleForm roles={exemptableRoles} />}
      list={
        <StatefulExemptRoleList roles={exemptRoles} staffRoleId={staffRoleId} />
      }
    />
  )
}

async function ChannelsFromDiscord({ linkRule }: FromDiscordProps) {
  const { exemptChannels, exemptableChannels } = await linkRule
  return (
    <ExemptChannelsSection
      channels={exemptChannels}
      form={<StatefulAddExemptChannelForm groups={exemptableChannels} />}
      list={<StatefulExemptChannelList channels={exemptChannels} />}
    />
  )
}

async function ActionFromDiscord({
  linkRule,
  staffMember,
}: FromDiscordProps & { staffMember: Promise<StaffMember> }) {
  const { action } = await linkRule
  const choices = actionChoicesOf(await staffMember, action)
  return (
    <LinkRuleActionSection
      action={action}
      form={
        action !== null && choices.length > 0 ? (
          <StatefulChangeLinkRuleActionForm
            choices={choices}
            current={action}
          />
        ) : null
      }
    />
  )
}

async function OtherExceptionsFromDiscord({ linkRule }: FromDiscordProps) {
  const { otherExceptions } = await linkRule
  return <OtherExceptionsSection entries={otherExceptions} />
}
