# Open questions

Decisions or facts the code and its history can't explain. Each entry gives the question, where it shows up, who is likely to know, and what is blocked on it. Remove an entry once it is answered, and record the answer where it belongs: `GLOSSARY.md`, an ADR, or the ticket it unblocks.

## Does Shor make money?

- **Question:** Does Shor sell anything, such as VIP status or perks for supporters?
- **Where it shows up:** Vercel's Hobby plan restricts users to non-commercial, personal use (https://vercel.com/docs/plans/hobby, updated 2026-09-14).
- **Who is likely to know:** the POs, Lyra-Gates and Anaisenkit.
- **Blocked on it:** hosting the panel on Vercel's Hobby plan, so the first production deploy.

## Which Discord server and which staff role?

- **Question:** What are the IDs of Shor's Discord server and of the role, or roles, that make a member staff?
- **Where it shows up:** the Admin Panel lets in only members holding the staff role, re-checked on every page view and every write (ADR 0005). The IDs are configuration, so development can go on without them. ShorBot's expected features, as Gilles relayed them on 2026-10-23, name a Staff role (« les membres du rôle Staff ») and a role per category of its support tickets (« @[rôle en charge du problème] »). Whether those per-category roles also make a member staff is part of this question. The moderation section narrows to two more lists, `MODERATION_ROLE_IDS` for the roles that moderate and `BAN_ROLE_IDS` for those that also ban (ADR 0005, #27): which roles go in each is part of it too.
- **Who is likely to know:** Anaisenkit, or any staff member with Discord's Developer Mode on.
- **Blocked on it:** the first production deploy, and the moderation section in production (#183).

## Which channel do the staff report panel problems in?

- **Question:** In which channel of Shor's Discord server should the staff report a problem with the panel, and does that channel exist yet?
- **Where it shows up:** the panel's error messages tell the staff to report a problem in the staff's Discord channel, named in the text (`CLAUDE.md`, **Errors**, decided by Gilles while grilling #49 on 2026-10-23). The error pages need its name.
- **Who is likely to know:** Anaisenkit, together with Lyra-Gates, the other PO, if the channel has to be created.
- **Blocked on it:** the final text of the error pages and of `/login/failed`, which says « le salon du staff sur Discord » until then (`src/staff/login-failed.tsx`), and so the first production deploy.

## How do Shor's whitelist and launcher work?

- **Question:** Where does the whitelist live: in Shor's SkyMP server, in its launcher, in a Discord role, or elsewhere? Who grants it today, and how? Can anything outside the game read or change it, and does the game know a player's Discord account?
- **Where it shows up:** the Admin Panel stays on Discord's side until this is known (Gilles, 2026-10-27, while grilling the features that follow the MVP). An application for the whitelist on the panel, a Linked Role fed by the game, and the game server's status all need the game's side. `GLOSSARY.md` defines the whitelist without saying where it is kept.
- **Who is likely to know:** loanspac, who said Shor has its own SkyMP server and launcher (ADR 0001), and the POs.
- **Blocked on it:** any feature of the panel that reads from or writes to the game.

## Where does a sanctioned member contest before #150?

- **Question:** Until the panel's contestation pages exist (#150), where should a member who received a timeout, a kick or a ban turn to contest it? A banned member can no longer open a support ticket on the Discord server.
- **Where it shows up:** the direct message the panel sends with a sanction says how to contest it, and nobody reads a reply to it, since the panel's application never connects to the gateway (ADR 0003; Gilles, 2026-10-28, while grilling #27).
- **Who is likely to know:** the POs, Lyra-Gates and Anaisenkit.
- **Blocked on it:** the final text of that direct message, which keeps a placeholder until then (#179).

## Are there minors on Shor's Discord server?

- **Question:** Does Shor's Discord server let in members under 18, and does Shor check anyone's age?
- **Where it shows up:** the CNIL requires a data protection impact assessment when a processing meets two of its nine criteria, among them « exclusion du bénéfice d'un droit/contrat » and « personnes vulnérables » (https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd, read 2026-10-28). Warnings and notes kept about members, beside their bans, likely meet the first, and minors would likely meet the second (inferred; `docs/personal-data.md`).
- **Who is likely to know:** the POs.
- **Blocked on it:** the grilling of the store (#175), which decides the measures to take before Neon opens.

## Who is responsible for the panel's personal data, and who answers requests?

- **Question:** What is Shor legally: an association, a company, or an informal group? Who, by name or role, is responsible for the personal data the panel processes, and where does a member send a request to access, correct or delete theirs?
- **Where it shows up:** Discord's Developer Terms of Service ask every application for a privacy policy that says « how users can request deletion of such data » (§5a, Wayback Machine copy of 2026-09-27, last updated 2024-06-06), and a GDPR notice names whoever is responsible and how to reach them (inferred from articles 13 and 14, not read here; `docs/personal-data.md`).
- **Who is likely to know:** the POs, and Gilles for the contact if he is the one who answers.
- **Blocked on it:** the final text of `/privacy` (#186), which keeps a placeholder until then, and so the first production deploy.
