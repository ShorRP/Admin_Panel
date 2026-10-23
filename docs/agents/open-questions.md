# Open questions

Decisions or facts the code and its history can't explain. Each entry gives the question, where it shows up, who is likely to know, and what is blocked on it. Remove an entry once it is answered, and record the answer where it belongs: `GLOSSARY.md`, an ADR, or the ticket it unblocks.

## Does Shor make money?

- **Question:** Does Shor sell anything, such as VIP status or perks for supporters?
- **Where it shows up:** Vercel's Hobby plan restricts users to non-commercial, personal use (https://vercel.com/docs/plans/hobby, updated 2026-09-14).
- **Who is likely to know:** the POs, Lyra-Gates and Anaisenkit.
- **Blocked on it:** hosting the panel on Vercel's Hobby plan, so the first production deploy.

## Which Discord server and which staff role?

- **Question:** What are the IDs of Shor's Discord server and of the role, or roles, that make a member staff?
- **Where it shows up:** the Admin Panel lets in only members holding the staff role, re-checked before every write. The IDs are configuration, so development can go on without them. ShorBot's expected features, as Gilles relayed them on 2026-10-23, name a Staff role (« les membres du rôle Staff ») and a role per category of its support tickets (« @[rôle en charge du problème] »). Whether those per-category roles also make a member staff is part of this question.
- **Who is likely to know:** Anaisenkit, or any staff member with Discord's Developer Mode on.
- **Blocked on it:** the first production deploy.
