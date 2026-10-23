# Open questions

Decisions or facts the code and its history can't explain. Each entry gives the question, where it shows up, who is likely to know, and what is blocked on it. Remove an entry once it is answered, and record the answer where it belongs: `GLOSSARY.md`, an ADR, or the ticket it unblocks.

## Is Shor built on skymp-heavy-rp?

- **Question:** Is Shor built on [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp) (its gamemode, launcher, MariaDB and `apps/web`), or does ShorBot only reuse its Discord bot?
- **Where it shows up:** ShorBot's files are byte-identical to that repo's `apps/bot-discord` apart from line endings (compared on 2026-10-23), and `index.js` still requires the absent `../shared/runtimeMetrics`. Lyra-Gates, a member of the ShorRP organization, holds an unmodified copy of the whole repo (https://github.com/Lyra-Gates/skymp-heavy-rp, last commit `aeeeb94`). Gilles judges it very probable. ADR 0001 is written on this assumption.
- **Who is likely to know:** loanspac, Lyra-Gates, the staff.
- **Blocked on it:** no ticket. A "no" makes the fallback of ADR 0001 (folding the panel into `apps/web`) moot.

## Does Shor make money?

- **Question:** Does Shor sell anything, such as VIP status or perks for supporters?
- **Where it shows up:** Vercel's Hobby plan restricts users to non-commercial, personal use (https://vercel.com/docs/plans/hobby, updated 2026-09-14). skymp-heavy-rp keeps a `vip_level` on accounts for VIP and supporters (`apps/web/server.js:172-174` upstream).
- **Who is likely to know:** the staff, through Anaisenkit.
- **Blocked on it:** hosting the panel on Vercel's Hobby plan, so the first production deploy.

## Which Discord server and which staff role?

- **Question:** What are the IDs of Shor's Discord server and of the role, or roles, that make a member staff?
- **Where it shows up:** the Admin Panel lets in only members holding the staff role, re-checked before every write. The IDs are configuration, so development can go on without them.
- **Who is likely to know:** Anaisenkit, or any staff member with Discord's Developer Mode on.
- **Blocked on it:** the first production deploy.

## Who is Lyra-Gates?

- **Question:** Who is the GitHub account `Lyra-Gates`, and what is their role in Shor?
- **Where it shows up:** member of the ShorRP organization and collaborator on this repo; holds the copy of skymp-heavy-rp cited above. The profile is empty and was created on 2026-08-31.
- **Who is likely to know:** the staff.
- **Blocked on it:** nothing. It tells who to ask about Shor's game server.
