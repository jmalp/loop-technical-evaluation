/**
 * The only place that reads the app URL and credentials from the environment (SPEC §3, NFR-09).
 *
 * Everything here is lazy: nothing is read until a function is called, so `--list` and
 * browser-free tests run without credentials. Error messages name the variable, never its value.
 */

/** Default app URL from SPEC §3, used when `BASE_URL` is unset or empty. */
export const DEFAULT_BASE_URL = 'https://create-asana-like-pr-39y5.bolt.host/';

export interface Credentials {
  /** From `LOOP_EMAIL`. The brief calls the field "Email", but the demo value is a username. */
  readonly username: string;
  /** From `LOOP_PASSWORD`. */
  readonly password: string;
}

type RequiredVariable = 'LOOP_EMAIL' | 'LOOP_PASSWORD';

function requireEnv(name: RequiredVariable): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.`,
    );
  }
  return value;
}

/** Reads the login credentials, failing fast if either variable is missing, empty or whitespace only. */
export function getCredentials(): Credentials {
  return {
    username: requireEnv('LOOP_EMAIL'),
    password: requireEnv('LOOP_PASSWORD'),
  };
}

/**
 * Reads `BASE_URL`. `||` (not `??`) is deliberate: CI passes an unset secret as an empty
 * string, and that must fall back to the default too.
 */
export function getBaseUrl(): string {
  return process.env.BASE_URL?.trim() || DEFAULT_BASE_URL;
}
