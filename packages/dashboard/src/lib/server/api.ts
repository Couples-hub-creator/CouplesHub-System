import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from '@/lib/server/auth';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(status: number, message: string, code = 'ERROR', details?: unknown) {
  return NextResponse.json({ error: { message, code, details } }, { status });
}

/**
 * Cookie-based mutations are same-site only. Browsers send Origin on POST,
 * PATCH and DELETE; if it does not match the host serving the request, reject
 * it before any session or database work happens.
 */
function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const origin = request.headers.get('origin');
  if (!origin) return; // non-browser client; the session cookie is still sameSite=lax

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, 'The request origin was not valid.', 'BAD_ORIGIN');
  }

  const host = request.headers.get('host');
  if (!host || originHost !== host) {
    throw new ApiError(
      403,
      'That request came from another site. Reload the dashboard and try again.',
      'BAD_ORIGIN',
    );
  }
}

/**
 * Wraps a route handler so every failure leaves the API in the same shape:
 * { error: { message, code } } — the client only renders `message`, so a
 * stack trace never reaches the browser.
 */
export function withHandler<Ctx>(
  fn: (request: Request, context: Ctx) => Promise<unknown>,
) {
  return async (request: Request, context: Ctx): Promise<NextResponse> => {
    try {
      assertSameOrigin(request);
      const result = await fn(request, context);
      if (result instanceof NextResponse) return result;
      return ok(result);
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error.status, error.message, error.code);
      }
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return fail(422, first?.message ?? 'That value is not valid.', 'VALIDATION');
      }
      console.error('[api]', error);
      return fail(500, 'The server could not complete that request. Try again.', 'INTERNAL');
    }
  };
}

export async function readJson<T>(request: Request, schema: { parse: (v: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'The request body was not valid JSON.', 'BAD_JSON');
  }
  return schema.parse(body);
}
