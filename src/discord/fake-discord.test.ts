import { describeDiscordApiContract } from "./discord-api-contract"
import { FakeDiscord } from "./fake-discord"

describeDiscordApiContract("The fake Discord", () => ({
  discord: new FakeDiscord(),
  outsider: "222222222222222222",
  cleanUp: () => Promise.resolve(),
}))
