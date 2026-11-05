import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { SupportTicketsSection } from "./support-tickets-section"

test("a section of the page is named by its heading, an h2, and holds what it is given after it", () => {
  const html = renderToStaticMarkup(
    <SupportTicketsSection id="open-tickets" title="En cours">
      <p>Contenu</p>
    </SupportTicketsSection>
  )

  expect(html).toMatch(/^<section aria-labelledby="open-tickets"/)
  expect(html).toMatch(
    /<h2 id="open-tickets"[^>]*>En cours<\/h2><p>Contenu<\/p>/
  )
})
