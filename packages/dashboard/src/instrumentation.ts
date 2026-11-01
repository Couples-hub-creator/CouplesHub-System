/**
 * Next calls this once when the server starts. Importing the env module here
 * runs the zod check before the first request, so a missing or malformed value
 * shows up in the server log instead of halfway through a sign-in.
 */
export async function register() {
  await import('./lib/env');
}
