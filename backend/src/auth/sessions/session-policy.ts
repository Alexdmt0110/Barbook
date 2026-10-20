const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

export const STANDARD_SESSION = Object.freeze({
  idleSeconds: 2 * HOUR_SECONDS,
  absoluteSeconds: 12 * HOUR_SECONDS,
});

export const PERSISTENT_SESSION = Object.freeze({
  idleSeconds: 7 * DAY_SECONDS,
  absoluteSeconds: 30 * DAY_SECONDS,
});

export function sessionPolicy(persistent: boolean) {
  return persistent ? PERSISTENT_SESSION : STANDARD_SESSION;
}
