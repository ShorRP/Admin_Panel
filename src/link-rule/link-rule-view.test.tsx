import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LinkRuleView } from "./link-rule-view"

function render() {
  return renderToStaticMarkup(
    <LinkRuleView
      switchCard={<b>the switch</b>}
      domains={<b>the domains</b>}
      roles={<b>the roles</b>}
      channels={<b>the channels</b>}
      action={<b>the action</b>}
      alert={<b>the alert</b>}
      otherExceptions={<b>the other exceptions</b>}
    />
  )
}

function texts(html: string) {
  return Array.from(html.matchAll(/>([^<]+)</g), ([, text]) => text)
}

test("the page opens with its overline, its h1 and its sentence, then gives the switch and the domains before the roles, the channels, the action, the alert channel and the other exceptions, which is the order of a phone's single column", () => {
  expect(texts(render())).toEqual([
    "AutoMod · règle du panel",
    "Liens",
    "Les messages qui contiennent un lien sont bloqués par Discord avant d’être publiés, sauf les liens des domaines permis et ceux des membres et des salons exemptés.",
    "the switch",
    "the domains",
    "the roles",
    "the channels",
    "the action",
    "the alert",
    "the other exceptions",
  ])
  expect(render()).toMatch(/<h1[^>]*>Liens<\/h1>/)
})

test("a rule with a diamond, hidden from assistive technologies, parts the header from the sections", () => {
  const html = render()
  const rule =
    /<div aria-hidden="true"[^>]*>(?:<span[^>]*><\/span>){3}<\/div>/.exec(html)

  expect(rule?.index).toBeGreaterThan(html.indexOf("Liens"))
  expect(rule?.index).toBeLessThan(html.indexOf("the switch"))
})
