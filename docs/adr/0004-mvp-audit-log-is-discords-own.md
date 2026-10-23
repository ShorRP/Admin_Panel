---
status: accepted
---

# The MVP's audit log is Discord's own audit log, annotated by the panel

For the MVP the Admin Panel stores nothing. Every AutoMod change it makes carries an `X-Audit-Log-Reason` header naming the staff member and the change, and the panel's audit log screen reads those entries back from the Discord server's audit log. Decided by Gilles on 2026-10-23 to avoid running a database for a single record, at the cost of Discord keeping audit log entries for 45 days only.

Facts from https://docs.discord.com/developers/resources/audit-log and https://docs.discord.com/developers/resources/auto-moderation on 2026-10-23: a reason holds 1 to 512 characters; reading the audit log needs the View Audit Log permission; entries are kept for 45 days; the AutoMod create, modify and delete endpoints accept the header; Discord does not guarantee that an entry's changes hold the old and new keyword lists, so the reason states what changed.

## Considered Options

- **Neon Postgres through the Vercel Marketplace.** Unlimited history and ready for later features. Its free plan is reported at 0.5 GB and 100 compute-hours a month per project, scaling to zero after 5 idle minutes (third-party sources, unconfirmed on Neon's plans page). It is the planned store once a feature needs one or the staff need more than 45 days of history.
- **A private staff channel used as a journal.** No infrastructure and no expiry, but anyone with Manage Messages can edit or delete it.

## Consequences

- The project stores no personal data for the MVP.
- Changes made directly in Discord's settings appear in the same audit log under the person's own name, without the panel's reason.
- When a database arrives, its audit rows take the shape of skymp-heavy-rp's `audit_logs` (ADR 0001).
