export type TimeoutFields =
  | { change: "time-out"; reason: string; duration: string; notify: boolean }
  | { change: "lift"; reason: string }

export type TimeoutResult =
  | { ok: true; message: string }
  | ({ ok: false; message: string } & TimeoutFields)
