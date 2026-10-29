import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoginNotice } from "./login-notice"

test("a login page opens on the theme toggle, its icons alone and on Auto until the browser reads the chosen theme, before its heading", () => {
  const html = renderToStaticMarkup(
    <LoginNotice title="Déconnexion">
      <p>Ta session sur le panel est terminée.</p>
    </LoginNotice>
  )
  const toggle = /<div role="group" aria-label="Thème"[^>]*>(.*?)<\/div>/.exec(
    html
  )

  expect({
    beforeHeading: toggle !== null && toggle.index < html.indexOf("<h1"),
    buttons: Array.from(
      toggle?.[1]?.matchAll(
        /<button[^>]*aria-pressed="([^"]*)"[^>]*><svg[^>]*>.*?<\/svg>(.*?)<\/button>/g
      ) ?? [],
      ([, pressed, content]) => ({ pressed, content })
    ),
  }).toEqual({
    beforeHeading: true,
    buttons: [
      { pressed: "true", content: '<span class="sr-only">Auto</span>' },
      { pressed: "false", content: '<span class="sr-only">Clair</span>' },
      { pressed: "false", content: '<span class="sr-only">Sombre</span>' },
    ],
  })
})
