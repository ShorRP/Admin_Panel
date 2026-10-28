import { describeDiscordApiContract } from "./discord-api-contract"
import { FakeDiscord } from "./fake-discord"

const OUTSIDER = { id: "222222222222222222", username: "outsider" }

const OWNER = { id: "222222222222222223", username: "owner" }

const MEMBER = { id: "222222222222222224", username: "member" }

const PANEL_ROLE = { id: "333333333333333333", name: "Shor Panel", position: 1 }

describeDiscordApiContract("The fake Discord", () => ({
  discord: new FakeDiscord({
    ownerId: OWNER.id,
    roles: [PANEL_ROLE],
    applicationRoles: [PANEL_ROLE.id],
    members: [{ user: OWNER }, { user: MEMBER }],
    users: [OUTSIDER],
  }),
  outsider: OUTSIDER.id,
  member: MEMBER.id,
  deleteMessage: () => Promise.resolve(),
  cleanUp: () => Promise.resolve(),
}))
