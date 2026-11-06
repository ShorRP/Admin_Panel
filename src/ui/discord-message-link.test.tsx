import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { DiscordMessageLink } from "@/ui/discord-message-link"

const HREF = "https://discord.com/channels/1/2/3"

function render() {
  return renderToStaticMarkup(<DiscordMessageLink href={HREF} />)
}

test("the link to a message says « Voir dans Discord » and leads to the address it is given", () => {
  const html = render()

  expect(html).toContain(`href="${HREF}"`)
  expect(html).toContain("Voir dans Discord")
})

test("the link opens a new tab without handing the opener to Discord, and is no next/link", () => {
  const html = render()

  expect(html).toContain('target="_blank"')
  expect(html).toContain('rel="noopener noreferrer"')
  expect(html).not.toContain("data-next")
})

test("the link's icon is hidden from assistive technologies", () => {
  expect(render()).toMatch(/<svg[^>]*aria-hidden="true"/)
})
