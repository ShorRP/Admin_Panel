# Open questions

Decisions or facts the code and its history can't explain. Each entry gives the question, where it shows up, who is likely to know, and what is blocked on it. Remove an entry once it is answered, and record the answer where it belongs: `GLOSSARY.md`, an ADR, or the ticket it unblocks.

## How do Shor's whitelist and launcher work?

- **Question:** Where does the whitelist live: in Shor's SkyMP server, in its launcher, in a Discord role, or elsewhere? Who grants it today, and how? Can anything outside the game read or change it, and does the game know a player's Discord account?
- **Where it shows up:** the Admin Panel stays on Discord's side until this is known (Gilles, 2026-10-27, while grilling the features that follow the MVP). An application for the whitelist on the panel, and a Linked Role fed by the game, need the game's side, as does the game servers' state that ShorBot shows (ADR 0003). `GLOSSARY.md` defines the whitelist without saying where it is kept.
- **Who is likely to know:** loanspac, who said Shor has its own SkyMP server and launcher (ADR 0001), and the POs.
- **Blocked on it:** any feature of the panel that reads from or writes to the game.

## Where does a banned account contest before #150?

- **Question:** Until the panel's contestation page exists (#150), where should an account the staff banned turn to contest the ban? It can no longer open a support ticket on the Discord server.
- **Where it shows up:** the direct message the panel sends with a sanction says how to contest it, and nobody reads a reply to it, since the panel's application never connects to the gateway (ADR 0003; Gilles, 2026-10-28, while grilling #27). A warning, a timeout and a kick are contested through a support ticket of the « ❓ Autre demande » kind, which ShorBot serves (ADR 0003): the POs' list of the Bot's features says so for a warning (relayed by Gilles on 2026-10-23, #4), and Gilles extended it to the timeout and the kick on 2026-10-28. A timed-out member keeps only View Channel and Read Message History (https://docs.discord.com/developers/topics/permissions, read 2026-10-28), so they can write in a ticket only once the timeout ends (inferred), and a kicked member joins again through an invite.
- **Who is likely to know:** Gilles, who decides it, and the POs for any way to reach the staff outside the Discord server.
- **Blocked on it:** the final text of the ban's direct message, which says until then « La marche à suivre pour le contester n’est pas encore fixée. » (`src/sanctions/ban-direct-message.ts`, #181).

## Are there minors on Shor's Discord server?

- **Question:** Does Shor's Discord server let in members under 18, and does Shor check anyone's age?
- **Where it shows up:** the CNIL requires a data protection impact assessment when a processing meets two of its nine criteria, among them « exclusion du bénéfice d'un droit/contrat » and « personnes vulnérables » (https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd, read 2026-10-28). Warnings and notes kept about members, beside their bans, likely meet the first, and minors would likely meet the second (inferred; `docs/personal-data.md`).
- **Who is likely to know:** the POs.
- **Blocked on it:** the grilling of the store (#175), which decides the measures to take before Neon opens.

## Who is responsible for the panel's personal data, and who answers requests?

- **Question:** What is Shor legally: an association, a company, or an informal group? Who, by name or role, is responsible for the personal data the panel processes, and where does a member send a request to access, correct or delete theirs?
- **Where it shows up:** Discord's Developer Terms of Service ask every application for a privacy policy that says « how users can request deletion of such data » (§5a, Wayback Machine copy of 2026-09-27, last updated 2024-06-06), and a GDPR notice names whoever is responsible and how to reach them (inferred from articles 13 and 14, not read here; `docs/personal-data.md`).
- **Who is likely to know:** the POs, and Gilles for the contact if he is the one who answers.
- **Blocked on it:** the final text of `/privacy` (#186), which keeps a placeholder until then.
