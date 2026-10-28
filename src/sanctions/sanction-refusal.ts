import "server-only"

import {
  PermissionFlagsBits,
  type APIRole,
  type Snowflake,
} from "discord-api-types/v10"

import type { DiscordApi, Guild } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"

type Hierarchy = {
  discordServer: Guild
  applicationRoleIds: Snowflake[]
}

type SanctionTarget = {
  id: Snowflake
  roleIds: Snowflake[]
}

export async function readTimeoutRefusal(
  discord: DiscordApi,
  staffMember: StaffMember,
  target: SanctionTarget
) {
  const hierarchy = await readHierarchy(discord)
  const refusal = sanctionRefusal(hierarchy, staffMember, target)
  if (refusal !== null) {
    return refusal
  }
  if (isAdministrator(hierarchy.discordServer, target.roleIds)) {
    return "Ce membre a la permission Administrateur : Discord ne l’exclut jamais temporairement."
  }
  return null
}

async function readHierarchy(discord: DiscordApi): Promise<Hierarchy> {
  const [discordServer, application] = await Promise.all([
    discord.getGuild(),
    discord.getApplicationUser(),
  ])
  const applicationMember = await discord.getMember(application.id)
  return { discordServer, applicationRoleIds: applicationMember?.roles ?? [] }
}

function sanctionRefusal(
  { discordServer, applicationRoleIds }: Hierarchy,
  staffMember: StaffMember,
  target: SanctionTarget
) {
  if (target.id === staffMember.id) {
    return "C’est ta propre fiche : tu ne peux pas te sanctionner toi-même."
  }
  if (target.id === discordServer.owner_id) {
    return "Tu ne peux pas sanctionner ce membre : c’est le propriétaire du serveur Discord."
  }
  const targetPosition = highestPosition(discordServer, target.roleIds)
  if (targetPosition >= highestPosition(discordServer, staffMember.roleIds)) {
    return "Tu ne peux pas sanctionner ce membre : son rôle le plus haut égale ou dépasse le tien."
  }
  if (targetPosition >= highestPosition(discordServer, applicationRoleIds)) {
    return "Le panel ne peut pas sanctionner ce membre : son rôle le plus haut égale ou dépasse celui de l’application du panel."
  }
  return null
}

function rolesOf(discordServer: Guild, roleIds: Snowflake[]): APIRole[] {
  return discordServer.roles.filter(
    ({ id }) => id === discordServer.id || roleIds.includes(id)
  )
}

function highestPosition(discordServer: Guild, roleIds: Snowflake[]) {
  return Math.max(
    ...rolesOf(discordServer, roleIds).map(({ position }) => position)
  )
}

function isAdministrator(discordServer: Guild, roleIds: Snowflake[]) {
  return rolesOf(discordServer, roleIds).some(
    ({ permissions }) =>
      (BigInt(permissions) & PermissionFlagsBits.Administrator) !== BigInt(0)
  )
}
