import type { Fetch } from "./rest"

export function answering(...answers: (Response | Error)[]) {
  const requests: Request[] = []
  const fetch: Fetch = (input, init) => {
    requests.push(new Request(input, init))
    const answer = answers.shift()
    if (answer === undefined) {
      return Promise.reject(new Error("No answer left"))
    }
    return answer instanceof Error
      ? Promise.reject(answer)
      : Promise.resolve(answer)
  }
  return { fetch, requests }
}
