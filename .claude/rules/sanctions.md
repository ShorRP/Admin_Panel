---
paths:
  - "src/sanctions/**"
  - "e2e/sanctions.test.ts"
---

# Sanctions

What the panel writes into Discord when a moderator sanctions an account from its record, a timeout and its lifting (#179), a kick (#180), a ban and its lifting (#181), and what the record shows of them: the card « Sanctions » (#234), its confirmation (#235) and the history (#177). The tests of `src/sanctions/` and `e2e/sanctions.test.ts` name each case. The evidence behind the Base UI choices, the contrast measures and the history's cost in calls are in `docs/sanctions.md`: read it before changing how the history reads the audit log or how a notice is colored.

## Write results

A sanction adds this to the shape of a write's result in `CLAUDE.md`, **Write results**.

- Discord unavailable while the panel reads the member and the role hierarchy returns `{ ok: false }` saying that the sanction did not happen, since a read that fails changes nothing on the Discord server; while it writes, one saying that it may or may not have landed. A timeout, a kick, a ban and the lifting of a timeout or of a ban all follow it (#213, #181).
- A timeout that lands returns `{ ok: true }` whatever its direct message then meets, since the sanction holds: its message says that the member did not receive it when Discord refuses it, or may not have when Discord is unavailable, and a message that fails otherwise is thrown, as a bug of the panel, so that it alerts though the timeout has landed (#179).
- A kick sends its direct message first, since a kicked account no longer shares a Discord server with the application (#180): the kick then happens whatever the message met, and the result says what the message met, as for a timeout. When Discord is unavailable during the kick, the result says that it may or may not have landed and, if the message went, to untick the direct message before retrying, since a retry would send it again. A panel error is thrown once the kick was tried, during the kick though the message went, or during the message though the kick landed (#180).
- A ban follows the kick's rules through the same `sanctionAfterDirectMessage`, its direct message sent first to a member and none to an account absent from the Discord server, which shares none with the application. Lifting a ban sends no message, for the same reason (#181).

## Forms

- « Sanctions » is a card, `RecordSanctions`, on `card` and bordered, as « Détails » is (#234). Its forms share one client leaf, `StatefulRecordSanctions`, one action and one pair of `role="status"` and `role="alert"` regions after the tabs, as a list's do, and each form says which change it makes through a hidden `change` field.
- A member's forms sit under shadcn/ui's Tabs on Base UI, « Exclusion temporaire » with the timeout's two forms, the lift's shown only while it runs, « Expulsion » and, for a staff member who bans, « Bannissement », where the mockup names the first « Exclusion » and shows the third to all (#179, #180, #181, #221, #234). An account absent from the Discord server offers the ban alone, without the direct message, and a banned account the lifting of its ban alone, with no tabs, to a staff member who bans (#181, #234).
- Base UI keeps the open tab, the first at each load, and each panel stays mounted, `hidden` and `inert` while its tab is closed, so that what is typed in a form outlives a move to another tab (decided by the agent on 2026-10-29, on #234, for Gilles to review). A tab's label wraps where the card is too narrow for the three, as at 360 px, each tab as wide as its label first (decided by the agent on 2026-10-29, on #234, for Gilles to review).
- Every button that sends a form, or opens the confirmation, is `disabled` while any form is pending, but the tabs stay enabled, since a disabled tab loses its selection and the open panel would close during the send (decided by the agent on 2026-10-29, on #234, for Gilles to review). The status region then reads « Envoi en cours… », with neither icon nor color (#179, #234).
- The regions sit after the tabs since the lift's form leaves once its write lands, and take no room while empty (#233, #234). The section is `hidden` while it offers no sanction, as once a kick lands, and the leaf stays mounted, so that the kick's toast stays (#227).
- The duration, the messages a ban deletes (« Aucun » checked by default) and the direct message are native controls, the last a checkbox checked by default, not Base UI's, since React resets a form through the DOM and Base UI's would outlive the reset (inferred; `docs/sanctions.md`). The duration is drawn as the mockup's seven buttons by its labels (M:500-504), each `<input>` covering its label, so that a click anywhere on the label reaches it, and « 1 heure » is checked by default, so that a successful timeout's reset checks it again while a refused one keeps the duration chosen (#221, #234). The messages a ban deletes keep the native look, which neither #234 nor the mockup draws (decided by the agent on 2026-10-29, on #234, for Gilles to review).
- Under `touch`, each duration is 44 px high and each choice, such as « Prévenir en message privé », 44 px at least, through `CHOICE_CLASS` of `sanction-form.ts`; the messages a ban deletes stand in `CHOICE_GROUP_CLASS`, a grid of two columns under `sm` and of columns of 170 px at least from `sm`, with 8 px between the columns and none between the rows (#361; the gaps decided by the agent on 2026-11-03, on #361, for Gilles to review, since #361 gives the columns and not the gaps).

## Confirmation

- A kick and a ban, of a member or of an account absent from the Discord server, ask for a confirmation, and no other write does (#221, #235): their form holds no submit button, and its red « Expulser » or « Bannir » is the trigger of shadcn/ui's Dialog on Base UI, which opens it with no check beforehand, since the domain stays the one validator.
- `SanctionConfirmationDialog` renders the Dialog around `SanctionConfirmation`, which asks « Expulser {nom} ? » or « Bannir {nom} ? » by the name the record's header shows, which `SanctionOptions` carries. Its two buttons sit side by side at every width, in a footer that is `grid grid-cols-2 gap-2` under `sm` and `sm:flex sm:justify-end` from it, in a dialog at `sm:max-w-110` (#235, #357; `docs/sanctions.md`).
- The confirmation, a `DialogClose` of `type="submit"`, sends the open tab's form through its `form` attribute, which names that form's `id`, `kick-form` or `ban-form`, each unique on a record, which shows one ban form at most, then closes the dialog, while « Annuler » closes it and writes nothing; the dialog is portaled out of the form (`docs/sanctions.md`). A missing reason comes back, once confirmed, in the alert region, and the form keeps what was typed (`.claude/rules/components.md`, **Forms**).
- `SanctionConfirmationDialog` passes `DIALOG_ONLY_FADES_WHEN_REDUCED` of `src/ui/dialog-motion.ts` (`.claude/rules/ui-overlays.md`, **Dialogs and sheets**).

## Buttons

- « Exclure temporairement », « Expulser » and « Bannir » are `default` Buttons, and « Lever l’exclusion temporaire » and « Lever le bannissement » are `outline`, since they undo (#221).
- « Expulser » and « Bannir » are red, as #221 decided: `RED_BUTTON_CLASS` of `sanction-form.ts` gives a `default` Button `bg-destructive text-destructive-foreground hover:bg-destructive/90`, so that the copied Button does not change (#234).
- « Expulser », « Bannir », « Exclure temporairement » and « Lever le bannissement » span their card, 38 px high as the mockup draws them (M:512), while « Lever l’exclusion temporaire » keeps its width in its notice (#234).
- Lifting a timeout or a ban asks no confirmation, while a kick and a ban do (#221, #235): their red buttons open the dialog and keep their text with no « … », which only a pending button takes, and the dialog offers « Annuler », `outline`, then its confirmation, red through `RED_BUTTON_CLASS` too and with the same icon (#235).

## Notices and history

- `SanctionNotice` draws the card's two notices, a running timeout's on a `warning/6` tint and a banned account's on a `destructive/10` tint, their text in `foreground`, from one table keyed by the sanction's kind, `timeout` or `ban`, and `SanctionHistory` keys its diamond's color by the change's kind in a `cva` of its own, so that no tone of `src/sanctions/` bears the name of the glossary's **Warning**, the sanction (#233, #234).
- The timeout's tint is `warning/6` where the mockup's is 10% (M:488), since the lift's reason sits in that notice and its field's border, `input`, must hold 3:1 (1.4.11) on it; the field keeps `card` as its fill in both schemes (decided by the agent on 2026-10-29, on #234, for Gilles to review). The measures are in `docs/sanctions.md`.
- `SanctionChangeSummary`, which says what a sanction or its lifting changed, in a record's history and in the audit log, stays in this folder: a component that renders a domain's own type stays in its domain for the other to import, since `src/ui/` imports nothing outside itself (Gilles, 2026-10-29, on #182).
- `sanction-events.ts` holds what `readAuditLog` and `readSanctionHistory` share of an automatic timeout, the audit log entry `AUTO_MODERATION_USER_COMMUNICATION_DISABLED`: `AUTOMATIC_TIMEOUT_EVENT`, whose action type both read, while the history alone takes its `changeOf`, `{ kind: "timeout", end: null }`, since the audit log builds its own change from the entry; `automaticTimeoutRuleNameOf`, so that the rule's name is read in one place; and `AUTO_MODERATION_NAME`, the label « AutoMod » that the audit log gives as the author and the history writes in « AutoMod, règle « <nom> » » (#327).
- `readSanctionHistory` leaves Discord's own reason out of that entry, which keeps Discord's English off a French interface (#177).

## Wording

`deName` of `de-name.ts` elides « de » before a name, « d’Aldis » but « de Lyra », in the four messages that name an account after it, the kick's, the ban's, the lifting of a ban's and the lifting of a timeout's (#219). The helper sits in this folder since only this folder uses it (decided by the agent on 2026-10-30, on #219, for Gilles to review).
