import { CircleAlert, X, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AllowedDomainList } from "./allowed-domain-list"
import type { DomainFields, WriteResult } from "./write-result"

function render(
  domains: string[],
  state: WriteResult<DomainFields> | null = null,
  pending = false,
  removable = true
) {
  return renderToStaticMarkup(
    <AllowedDomainList
      domains={domains}
      removable={removable}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function region(html: string, role: "status" | "alert") {
  const content =
    new RegExp(`<p role="${role}"[^>]*>(.*?)</p>`).exec(html)?.[1] ?? ""
  return {
    icon: /<svg[^>]*>(.*?)<\/svg>/.exec(content)?.[1],
    text: content.replace(/<[^>]*>/g, ""),
  }
}

function chips(html: string) {
  return Array.from(
    html.matchAll(/<li[^>]*>(.*?)<\/li>/g),
    ([, chip = ""]) => ({
      domain: /^<span[^>]*>([^<]*)<\/span>/.exec(chip)?.[1],
      sent: /<input[^>]*type="hidden"[^>]*name="domain"[^>]*value="([^"]*)"/.exec(
        chip
      )?.[1],
      cross: /<button[^>]*>(?:<svg([^>]*)>(.*?)<\/svg>)(.*?)<\/button>/
        .exec(chip)
        ?.slice(1),
      disabled: /<button[^>]*\sdisabled=""/.test(chip),
    })
  )
}

function chip(domain: string, disabled = false) {
  return {
    domain,
    sent: domain,
    cross: [
      expect.stringContaining('aria-hidden="true"'),
      drawing(X),
      `<span class="sr-only">Retirer « ${domain} »</span>`,
    ],
    disabled,
  }
}

const EMPTY = { icon: undefined, text: "" }

test("each allowed domain is a chip with a cross that sends it as it stands, whose hidden icon leaves it the name « Retirer « domaine » » for assistive technologies", () => {
  const html = render(["twitch.tv", "youtube.com"])

  expect(chips(html)).toEqual([chip("twitch.tv"), chip("youtube.com")])
})

test("the cross submits at once: it asks for no confirmation, since adding the domain back undoes it", () => {
  const html = render(["twitch.tv"])

  expect(html).toMatch(/<button[^>]*type="submit"/)
  expect(html).not.toContain("aria-haspopup")
})

test("a domain that the staff typed in Discord, whatever it holds, is escaped in the chip and in what the cross sends", () => {
  const html = render(['"><script>.com'])

  expect(html).not.toContain('"><script>')
  expect(chips(html)).toEqual([
    {
      ...chip("&quot;&gt;&lt;script&gt;.com"),
      cross: [
        expect.stringContaining('aria-hidden="true"'),
        drawing(X),
        '<span class="sr-only">Retirer « &quot;&gt;&lt;script&gt;.com »</span>',
      ],
    },
  ])
})

test("while the rule does not exist, the domains it would start with show with no cross, since a removal could only be refused", () => {
  const html = render(["twitch.tv", "youtube.com"], null, false, false)

  expect(chips(html)).toEqual([
    { domain: "twitch.tv", sent: undefined, cross: undefined, disabled: false },
    {
      domain: "youtube.com",
      sent: undefined,
      cross: undefined,
      disabled: false,
    },
  ])
  expect(html).not.toContain("<form")
  expect(html).not.toContain("<button")
})

test("with no allowed domain the list draws no list", () => {
  const html = render([])

  expect(html).not.toContain("<ul")
  expect(chips(html)).toEqual([])
})

test("with nothing written, the status and alert regions are empty", () => {
  const html = render(["twitch.tv"])

  expect(region(html, "status")).toEqual(EMPTY)
  expect(region(html, "alert")).toEqual(EMPTY)
})

test("while a write is pending, every cross is disabled and the status region reads « Envoi en cours… »", () => {
  const html = render(["twitch.tv", "youtube.com"], null, true)

  expect(chips(html)).toEqual([
    chip("twitch.tv", true),
    chip("youtube.com", true),
  ])
  expect(region(html, "status")).toEqual({
    icon: undefined,
    text: "Envoi en cours…",
  })
})

test("a refused removal shows its message in the alert region, after a hidden alert icon", () => {
  const html = render(["twitch.tv"], {
    ok: false,
    message: "La règle des liens n’existe pas encore.",
    domain: "twitch.tv",
  })

  expect(region(html, "alert")).toEqual({
    icon: drawing(CircleAlert),
    text: "La règle des liens n’existe pas encore.",
  })
})
