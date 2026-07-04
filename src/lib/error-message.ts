// Errors thrown inside a server function handler cross the client/server
// RPC boundary as plain deserialized objects (a `{ message, ... }` shape),
// not real `Error` instances -- `err instanceof Error` is false for them on
// the client even though `err.message` is a perfectly good string. Every
// catch block in this app that checked `instanceof Error` before reading
// `.message` was silently discarding the real server error and falling
// back to a generic string instead (confirmed: the AI-analysis "failed"
// toast showed a hardcoded fallback while a sibling error-surfacing effect
// that read `.message` directly showed the real GraphQL error just fine).
// Use this instead of `instanceof Error` checks anywhere a server-fn error
// might land.
export function getErrorMessage(err: unknown, fallback?: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const msg = (err as Record<string, unknown>).message;
    if (typeof msg === "string" && msg) return msg;
  }
  if (typeof err === "string" && err) return err;
  return fallback ?? String(err);
}
