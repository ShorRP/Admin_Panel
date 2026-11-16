---
status: accepted
---

# Links are blocked by a host-only regex and a prefix-wildcard allow list, in a rule of their own

The Admin Panel blocks links on the Discord server through one AutoMod keyword rule of its own, « Liens bloqués du panel », the link rule (`GLOSSARY.md`), which it creates and keeps as it keeps the panel's rules (ADR 0002): recognized by its name, re-read before each write, which changes only what the panel owns. Its regex patterns find the start of a clickable link up to its host, `https?://[^\s/?#]+`, and an invite written without a scheme, `(?:discord\.gg|discord(?:app)?\.com/invite)/\S+`. An allowed domain such as `youtube.com` becomes four entries of the rule's allow list, `https://youtube.com`, `https://youtube.com/*`, `https://www.youtube.com` and `https://www.youtube.com/*`. The rule exempts the staff role always, and the exempt roles and exempt channels the staff choose, carries a single action, which blocks the message, or blocks it and times the member out for an hour or a day, with no kick and no ban, can alert a channel the staff choose, and is turned on and off as a whole. Decided by Gilles on 2026-11-16, while grilling #480.

Why the allow list takes that shape, from trials on Gilles' test Discord server on 2026-11-16, with an account holding neither Administrator nor Manage Server, and Discord's documentation, which says only that the allow list holds "substrings which should not trigger the rule" (https://docs.discord.com/developers/resources/auto-moderation, read 2026-11-16):

- The allow list is not compared with what the regex matched, but with each word of the message, with the keywords' wildcards. With `https?://\S+`, the entry `youtube.com` let no link through, and `*youtube.com` let `https://arnaque.ru/?v=youtube.com` through and blocked `https://www.youtube.com/watch?v=abc`.
- The entry `https://www.youtube.com/*` let `https://www.youtube.com/watch?v=abc` through, in any case and within a sentence, and `https://www.youtube.com` the bare link. With the host-only regex, `https://youtube.com.arnaque.ru/x`, `https://arnaque.ru/?v=youtube.com` and a message holding an allowed link beside another were blocked.
- Discord's GIF picker posts `https://klipy.com/gifs/…` links, which a rule without `klipy.com` blocks.
- Rust's regex, the only flavor AutoMod takes (same page), has no look-around, so no pattern alone can say "a link, but not to this domain" (inferred from the regex crate).

The rule starts with eight allowed domains: `youtube.com`, `youtu.be`, `twitch.tv`, `klipy.com`, `tenor.com`, `giphy.com`, `cdn.discordapp.com` and `media.discordapp.net`; invites stay blocked. An allow list entry that does not fit the four-entry shape, added in Discord, shows read-only and stays through the panel's writes.

## Considered Options

- **The link patterns in one of the panel's rules**, which costs no keyword rule: AutoMod holds exempt roles and channels on a rule, so a channel where links pass would let blocked words pass too.
- **A plain entry or a leading wildcard per domain** (`youtube.com`, `*youtube.com`): the first allows no link, the second allows any word that ends with the domain, a phishing link's query included.
- **A pattern matching the whole link** (`https?://\S+`): the regex would find nothing the allow list cannot compare by word anyway, and nothing stops `youtube.com.arnaque.ru`.
- **A kick or a ban for a link**, which ShorBot would apply as for a blocked word (ADR 0003): left to the staff by hand from a record, so ShorBot has nothing to do for links (ShorRP/ShorBot#123).

## Consequences

- With the five rules of the blocked words once #328 lands, the link rule takes the sixth and last keyword rule of the Discord server: no keyword rule is left for the staff to make by hand, and none for #147's other AutoMod rules. Shor held no hand-made keyword rule on 2026-11-16 (Gilles).
- At four entries a domain and 100 allow list entries a rule, the rule holds 25 allowed domains at most.
- A link through `http://`, a subdomain other than `www`, such as `m.youtube.com`, unless allowed on its own, and a link glued to punctuation, such as `(https://youtube.com/…)`, are blocked.
- The owner of the Discord server and members with Administrator or Manage Server post any link, as AutoMod spares them (ADR 0002); an Administrator account let every link of the trial through.
- A link written without a scheme, such as `exemple.com`, which Discord does not make clickable, passes, as do disguised links such as `hxxp://`.
