---
status: accepted
---

# The panel reads the ticket archives from Discord

The Admin Panel shows an account's support tickets on its record (#197) by reading the ticket archives that ShorBot posts in the archives channel, « 📃・transcriptions » on Shor, through Discord's REST API with the token of the application they share (ADR 0008). ShorBot sends the panel nothing, and the panel keeps no copy: no Route Handler, no shared secret, no row in the store. Decided by Gilles on 2026-11-04, while grilling ShorRP/ShorBot#26, since nothing says the panel will ever have a store for the archives (Gilles, 2026-11-03, on #197), and Discord already keeps them; ShorBot's ADR 0008 records it on its side.

The embed's title, « 🗄️ ARCHIVE D'UN TICKET », its six field names, « Ouvert par », « Fermé par », « Type de demande », « Ouvert le », « Fermé le » and « Motif », the ID in plain text beside each mention, the request kind's emoji and label or « Inconnu », and the `<t:…:F>` timestamps are a contract between the two repositories: a change to one of them lands in both, in two PRs that name each other.

## Considered Options

- **ShorBot posting each archive to a Route Handler of the panel, authenticated by a shared secret, into the store** (ADR 0003, 2026-10-28): it waited on a store nobody has planned (#174), and added a secret on two hosts and a second copy of the archive.
- **No archive on the record**: « 📃・transcriptions » alone.

## Consequences

- #197 no longer waits on the store (#174, #175). Its retention is the message's: an archive stays until a staff member deletes it, which is also how one is erased.
- The panel's configuration holds the archives channel's ID for each Discord server, beside ShorBot's.
- The panel finds an account's archives through Discord's guild message search, whose text is the account's ID (#387, 2026-11-05). The embed holds that ID in the field of its opener and in that of its closer, and the search cannot tell the fields apart (ADR 0010), so the panel keeps the archives the account opened. It reads the 100 newest messages that cite the account at most, 4 searches of 25, since the search allows about one call every 4 to 5 s, and the record says so when more cite it, which a staff member who closed many tickets can meet. The search needs the Message Content intent (https://docs.discord.com/developers/change-log, 2026-03-19; ADR 0010). The panel first paged the channel's history, 100 messages a call and 10 calls at most, which needs no privileged intent, and did not read past the 1,000 newest messages (#197).
- The archive holds no conversation: the support ticket's channel and its messages are gone 5 seconds after its closing (ShorRP/ShorBot#23).
