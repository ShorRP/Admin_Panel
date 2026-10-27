---
status: accepted
---

# The MVP's audit log is Discord's own audit log, annotated by the panel

For the MVP the Admin Panel stores nothing. Every AutoMod change it makes carries an `X-Audit-Log-Reason` header naming the staff member and the change, and the panel's audit log screen reads those entries back from the Discord server's audit log. Decided by Gilles on 2026-10-23 to avoid running a database for a single record, at the cost of Discord keeping audit log entries for 45 days only.

Facts from https://docs.discord.com/developers/resources/audit-log and https://docs.discord.com/developers/resources/auto-moderation on 2026-10-23: a reason holds 1 to 512 characters; reading the audit log needs the View Audit Log permission; entries are kept for 45 days; the AutoMod create, modify and delete endpoints accept the header; Discord does not guarantee that an entry's changes hold the old and new keyword lists, so the reason states what changed.

After the MVP the panel stores what Discord cannot keep for it, personal data included, kept to what each feature needs, which that feature's grilling settles (Gilles, 2026-10-27, while grilling the features that follow the MVP). The store is Neon, on an account opened at Neon itself, never through the Vercel-managed integration, which is "Paid through Vercel" where the Neon-managed one is "Paid through Neon" (https://neon.com/docs/guides/vercel-overview, read 2026-10-27). Neon's own pages, read on 2026-10-27, correct the figures below: "The Free plan is permanent (not a trial); no credit card required", with 1 GB of storage and 100 CU-hours a month per project; past a limit, compute is suspended or writes fail, and "None of these limits delete your data" (https://neon.com/pricing, https://neon.com/docs/introduction/plans). Supabase, which Gilles knows better, was set aside: its free projects pause "after 1 week of inactivity" (https://supabase.com/pricing, read 2026-10-27) until someone resumes them by hand, and on its Free plan a function on Vercel reaches the database only through its shared pooler, since direct connections are IPv6 only (https://supabase.com/docs/guides/database/connecting-to-postgres, read 2026-10-27).

## Considered Options

- **Neon Postgres through the Vercel Marketplace.** Unlimited history and ready for later features. Its free plan is reported at 0.5 GB and 100 compute-hours a month per project, scaling to zero after 5 idle minutes (third-party sources, unconfirmed on Neon's plans page). It is the planned store once a feature needs one or the staff need more than 45 days of history.
- **A private staff channel used as a journal.** No infrastructure and no expiry, but anyone with Manage Messages can edit or delete it.

## Consequences

- The project stores no personal data for the MVP.
- Changes made directly in Discord's settings appear in the same audit log under the person's own name, without the panel's reason.
- When a database arrives, its audit rows identify the staff member by Discord ID.
