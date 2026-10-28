export type TimeoutFields =
  | { change: "time-out"; reason: string; duration: string; notify: boolean }
  | { change: "lift"; reason: string }

export type KickFields = { change: "kick"; reason: string; notify: boolean }

type SanctionFields = TimeoutFields | KickFields

export type SanctionResult<Fields extends SanctionFields = SanctionFields> =
  { ok: true; message: string } | ({ ok: false; message: string } & Fields)

export type TimeoutResult = SanctionResult<TimeoutFields>

export type KickResult = SanctionResult<KickFields>
