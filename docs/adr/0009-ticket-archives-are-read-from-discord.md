---
status: accepted
---

# The panel reads the ticket archives from Discord

The Admin Panel shows an account's support tickets on its record (#197) by reading the ticket archives that ShorBot posts in the archives channel, « 📃・transcriptions » on Shor, through Discord's REST API with the token of the application they share (ADR 0008). ShorBot sends the panel nothing, and the panel keeps no copy: no Route Handler, no shared secret, no row in the store. Decided by Gilles on 2026-11-04, while grilling ShorRP/ShorBot#26, since nothing says the panel will ever have a store for the archives (Gilles, 2026-11-03, on #197), and Discord already keeps them; ShorBot's ADR 0008 records it on its side.

The embed's title, « 🗄️ ARCHIVE D'UN TICKET », its six field names, « Ouvert par », « Fermé par », « Type de demande », « Ouvert le », « Fermé le » and « Motif », the ID in plain text beside each mention, the request kind's emoji and label or « Inconnu », and the `<t:…:F>` timestamps are a contract between the two repositories: a change to one of them lands in both, in two PRs that name each other. The four request kinds of ShorBot's `REQUEST_KINDS`, each with its emoji and its label, join the contract on 2026-11-05: the panel's page of archives filters by kind and counts them, and it finds a kind by searching its emoji (#386). ShorRP/ShorBot#91 lists the kinds in ShorBot's ADR 0008. A kind that ShorBot adds shows in the list and in "Tout", with no pill of its own, until the panel adds it.

## Considered Options

- **ShorBot posting each archive to a Route Handler of the panel, authenticated by a shared secret, into the store** (ADR 0003, 2026-10-28): it waited on a store nobody has planned (#174), and added a secret on two hosts and a second copy of the archive.
- **No archive on the record**: « 📃・transcriptions » alone.

## Consequences

- #197 no longer waits on the store (#174, #175). Its retention is the message's: an archive stays until a staff member deletes it, which is also how one is erased.
- The panel's configuration holds the archives channel's ID for each Discord server, beside ShorBot's.
- The panel finds an account's archives through Discord's guild message search, whose text is the account's ID (#387, 2026-11-05). The embed holds that ID in the field of its opener and in that of its closer, and the search cannot tell the fields apart (ADR 0010), so the panel keeps the archives the account opened. It reads the 100 newest messages that cite the account at most, 4 searches of 25, since the search allows about one call every 4 to 5 s, and the record says so when more cite it, which a staff member who closed many tickets can meet. The search needs the Message Content intent (https://docs.discord.com/developers/change-log, 2026-03-19; ADR 0010). The panel first paged the channel's history, 100 messages a call and 10 calls at most, which needs no privileged intent, and did not read past the 1,000 newest messages (#197).
- The archive holds no conversation: the support ticket's channel and its messages are gone 5 seconds after its closing (ShorRP/ShorBot#23).

## The support tickets in progress

Added by #388 on 2026-11-05, from the grilling of #380 (Gilles). The page `/support-tickets` also lists the support tickets still open, read at each view from the tickets' category with the same REST API and the same application (ADR 0008), and kept nowhere (ADR 0010). What the panel reads of them is a contract with ShorBot, as the archive's embed is, and ShorBot's side of it is the section « The support tickets in progress » of its ADR 0008 (the twin PR ShorRP/ShorBot#91): a change to one of the points below lands in both repositories, in two PRs that name each other.

**Facts**, from `shorbot/support_tickets.py`, `shorbot/config.py` and `shorbot/discord_adapter.py` on `dev-gilles`, commit 9915eb7, read on 2026-11-05:

- The tickets are channels of one category, `TICKET_CATEGORY_ID` (`config.py:20`, `1559574907426439229` on Shor), which holds 50 channels at most: `CATEGORY_LIMIT` (`support_tickets.py:53`), checked before a ticket opens (`:328`).
- A ticket's channel is named `{emoji}・{name}`, the separator being U+30FB (`NAME_SEPARATOR`, `:54`), as `_open` writes it (`:330-335`) and `kind_of` reads it, by `startswith` over the kinds in order (`:150-158`).
- The four request kinds are 🔧 Problème technique, 🚨 Signaler un joueur, 🎭 Demande RP and ❓ Autre demande (`REQUEST_KINDS`, `config.py:33-70`), written `{emoji} {label}` in an archive (`kind_label`, `support_tickets.py:112-113`).
- The opener is the one non-role target with an overwrite that allows View Channel: `_opener_id` (`discord_adapter.py:139-145`) gives none for zero or several, and `ticket_category` leaves a channel with no opener out of its tickets (`:447-460`).
- `create_support_ticket_channel` writes the overwrites (`:462-483`): `@everyone` cannot view the channel (`TICKET_HIDDEN`), the application's own role can (`TICKET_OWN_ROLE`), and the opener and the roles of the request kind (`role_ids_by_kind`, `support_tickets.py:313`) get `TICKET_PARTICIPANT` (`discord_adapter.py:35-42`). The channel is not synced with its category.

**What the panel does with them**

- A channel is a ticket when it is a text channel whose `parent_id` is the configured category, whose name starts with the emoji of one of the four kinds and the separator, and that has exactly one overwrite of a member allowing View Channel, the opener's. Any other channel of the category is left out. ShorBot's `ticket_category` would also keep a channel whose name names no kind, which the panel does not, since the page shows the request kind (#388, from the ticket's « ne suit pas le nom de ShorBot »).
- It shows a ticket to a staff member only if they view its channel on Discord, which it works out from the channel's own overwrites and never from its category's, since the channel is not synced with it (`viewsChannel`, #384).
- It reads the last 100 messages of each ticket, with the Message Content intent (ADR 0010), which empties the content and the embeds of another author's message without it.

**Inferences**

- From 2026-11-16, `GET /guilds/{guild.id}/channels` omits the channels the application cannot view (https://docs.discord.com/developers/change-log, 12 August 2026, read 2026-11-05), so the tickets stay listed to the application only while `TICKET_OWN_ROLE` stays in each channel's overwrites: the application's role holds View Channel on a ticket's channel by that overwrite and not by its category's, which a ticket is not synced with (#384, #382).
- The ticket's opener is told apart from the roles by the overwrite's type, 1 for a member and 0 for a role (`permission_overwrites`), the type that `_is_role` tests on discord.py's side.
