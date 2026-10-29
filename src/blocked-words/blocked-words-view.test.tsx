import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordsView } from "./blocked-words-view"

function render() {
  return renderToStaticMarkup(
    <BlockedWordsView
      capacity={<b>the capacity gauge</b>}
      form={<b>the form</b>}
      list={<b>the list</b>}
      otherRules={<b>the other rules</b>}
    />
  )
}

function texts(html: string) {
  return Array.from(html.matchAll(/>([^<]+)</g), ([, text]) => text)
}

test("the page opens with its overline, its h1 and its sentence beside the capacity gauge, then gives the form and the list before the side column, the exceptions' card over the other AutoMod rules", () => {
  expect(texts(render())).toEqual([
    "AutoMod · règle du panel",
    "Mots interdits",
    "Les messages qui contiennent l’un de ces mots ou expressions sont bloqués par Discord avant d’être publiés.",
    "the capacity gauge",
    "the form",
    "the list",
    "Exceptions",
    "Les mots interdits ne s’appliquent ni au propriétaire du serveur Discord, ni aux membres qui ont la permission « Administrateur » ou « Gérer le serveur ».",
    "the other rules",
  ])
})

test("a rule with a diamond, hidden from assistive technologies, parts the header from the form", () => {
  const html = render()
  const rule =
    /<div aria-hidden="true"[^>]*>(?:<span[^>]*><\/span>){3}<\/div>/.exec(html)

  expect(rule?.index).toBeGreaterThan(html.indexOf("the capacity gauge"))
  expect(rule?.index).toBeLessThan(html.indexOf("the form"))
})
