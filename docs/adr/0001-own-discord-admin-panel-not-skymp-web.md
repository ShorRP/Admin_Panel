---
status: deprecated
---

# The Admin Panel is its own Discord-administration app, not Shor's copy of skymp-heavy-rp's web panel

This ADR assumed that Shor ran [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp), and chose not to take over its `apps/web` staff panel. Shor does not run it: the skymp-heavy-rp fork dates from Primétoile, another Skyrim roleplay project, and since the merger Shor has its own SkyMP server and launcher (loanspac, also known as Spar, as relayed by Gilles on 2026-10-23). With no `apps/web` to take over or fold the panel into, nothing is left to decide here. What still holds, a Discord application of the panel's own and REST-only access to Discord, is recorded in ADRs 0002 and 0003. Deprecated by Gilles on 2026-10-23.
