import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { ReportChannelLink } from "@/ui/report-channel-link"

test("the channel where the staff report a panel problem is « #créer-ticket », linked on Shor's Discord server and opened in a new tab", () => {
  const html = renderToStaticMarkup(<ReportChannelLink />)

  expect(/<a[^>]*>(.*)<\/a>/.exec(html)?.[1]).toBe("#créer-ticket")
  expect(/\shref="([^"]*)"/.exec(html)?.[1]).toBe(
    "https://discord.com/channels/1545540661774913626/1550835033311412224"
  )
  expect(/\starget="([^"]*)"/.exec(html)?.[1]).toBe("_blank")
  expect(/\srel="([^"]*)"/.exec(html)?.[1]).toBe("noopener noreferrer")
})
