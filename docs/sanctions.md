# Sanctions

The evidence behind `.claude/rules/sanctions.md`: what Base UI does that the card's forms work around, the contrast measures of its notices, and what the history costs in calls to Discord. The rule says what to do; this file says how it was known. #179 wrote the timeout, #180 the kick, #181 the ban and its lifting, #177 the history, #182 and #327 its automatic timeouts, #234 the card and #235 its confirmation.

The `node_modules` citations are those of Base UI 1.9.0: an update of a package re-reads the citations that name it (`.claude/rules/dependencies.md`, **Docs that name a version**).

## The card

- Base UI moves the selection off a disabled tab to the first enabled one, or to none when every tab is disabled (`node_modules/@base-ui/react/tabs/root/TabsRoot.js:160-168`, `:211-234`). With every tab disabled during a send, the open panel would close and every panel would stay closed after it, which is why the buttons are disabled while a form is pending and the tabs are not.
- Neither Base UI's Checkbox nor its RadioGroup listens for a form's `reset`: `grep -i reset` in `node_modules/@base-ui/react/checkbox/root/CheckboxRoot.js` and `radio-group/` finds one match, `CheckboxRoot.js:153`, which is about `indeterminate` (2026-11-12). React resets a form through the DOM, so the native controls take the reset and Base UI's state would outlive it (inferred).
- The timeout's notice sits on `warning/6` where the mockup's tint is 10%: on `warning/10` over `card`, the border of the lift's reason, `input`, gave 2.91:1 in light, under the 3:1 of 1.4.11, and 3.07:1 on `warning/6`. The field keeps `card` as its fill in both schemes, since its dark `input/30` over the tint left `input` at 2.73:1 (a scratch port of the measure of `src/ui/globals.test.ts`, 2026-10-29, #234).

## The confirmation

- Base UI keeps the dialog's open state, as the Sheet's, focuses « Annuler » as it opens and gives the focus back to the trigger as it closes, on Escape too (a throwaway Playwright probe, 2026-10-29, #235).
- With no submit button in the form, Enter on its checkbox sends nothing (the same probe).
- Base UI portals the dialog out of the form (`node_modules/@base-ui/react/floating-ui-react/components/FloatingPortal.js:89`, `:201`), so the confirmation reaches its form through the `form` attribute, and `sanction-confirmation.test.tsx` renders its content inside a `Dialog` root, since a portal renders nothing on the server.
- The captures of #239 draw the confirmation without an icon on its button and the ban's trigger as « Bannir… », which #235 does not follow.
- The copied Backdrop stays, `bg-black/10` with `backdrop-blur-xs`, where the captures of #239 draw a veil with no blur, since #221 gives `--overlay` to the copied classes.
- The captures M:579-602, which #235 cites, and those of #239 draw the two buttons side by side at every width, on the dialog's own surface, where the copied `DialogFooter` stacks them under `sm` on a band of `muted/50`; they are in two equal columns under `sm` since #357.

## The history

- A record's history adds, at each view, one call to the audit log for each of the five kinds of entry it reads, the staff's timeouts and their lifting, the kicks, the bans and their lifting, and AutoMod's automatic timeouts (`SANCTION_EVENTS`, in `read-sanction-history.ts`), and one more for each further 100 entries of that kind within Discord's 45 days, one after another, since no parameter filters the audit log by the account it targets (https://docs.discord.com/developers/resources/audit-log, read 2026-10-28; #177).
