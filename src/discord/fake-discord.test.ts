import { describeDiscordApiContract } from "./discord-api-contract"
import { FakeDiscord } from "./fake-discord"

const OUTSIDER = { id: "222222222222222222", username: "outsider" }

describeDiscordApiContract("The fake Discord", () => ({
  discord: new FakeDiscord({ users: [OUTSIDER] }),
  outsider: OUTSIDER.id,
  cleanUp: () => Promise.resolve(),
}))
