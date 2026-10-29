import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { MemberAvatar } from "@/ui/member-avatar"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

test("a member without an avatar shows the first letter of their name, in capitals", () => {
  expect(
    text(renderToStaticMarkup(<MemberAvatar name="aldis" avatarUrl={null} />))
  ).toBe("A")
})

test("a member's initials take the first letter of at most two words of their name", () => {
  expect(
    text(
      renderToStaticMarkup(
        <MemberAvatar name="Brynja la Rouge" avatarUrl={null} />
      )
    )
  ).toBe("BL")
})

test("a member's initials skip the words that start with neither a letter nor a digit", () => {
  expect(
    text(
      renderToStaticMarkup(
        <MemberAvatar name="Lyra | Garde de Blancherive" avatarUrl={null} />
      )
    )
  ).toBe("LG")
})

test("a member whose name holds no word that starts with a letter or a digit shows its first character", () => {
  expect(
    text(renderToStaticMarkup(<MemberAvatar name="~ ~" avatarUrl={null} />))
  ).toBe("~")
})

test("a member with an avatar shows their initials until the browser has loaded it", () => {
  expect(
    text(
      renderToStaticMarkup(
        <MemberAvatar
          name="Corvus"
          avatarUrl="https://cdn.discordapp.com/avatars/1400000000000000003/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64"
        />
      )
    )
  ).toBe("C")
})

test("a member's avatar is hidden from assistive technologies, since their name sits beside it", () => {
  expect(
    renderToStaticMarkup(<MemberAvatar name="aldis" avatarUrl={null} />)
  ).toMatch(/^<\w+ [^>]*aria-hidden="true"/)
})
