export type TimeoutFields =
  | { change: "time-out"; reason: string; duration: string; notify: boolean }
  | { change: "lift"; reason: string }

export type KickFields = { change: "kick"; reason: string; notify: boolean }

export type BanFields = {
  change: "ban"
  reason: string
  deleteMessages: string
  notify: boolean
}

export type BanLiftFields = { change: "lift-ban"; reason: string }

export type SanctionFields =
  TimeoutFields | KickFields | BanFields | BanLiftFields

export type SanctionResult<Fields extends SanctionFields = SanctionFields> =
  { ok: true; message: string } | ({ ok: false; message: string } & Fields)

export type TimeoutResult = SanctionResult<TimeoutFields>

export type KickResult = SanctionResult<KickFields>

export type BanResult = SanctionResult<BanFields>

export type BanLiftResult = SanctionResult<BanLiftFields>
