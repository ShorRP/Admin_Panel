import {
  answerInteraction,
  readInteractionsEnv,
} from "@/discord/answer-interaction"

export async function POST(request: Request) {
  return await answerInteraction(request, readInteractionsEnv())
}
