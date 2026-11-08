import { getSession } from "./auth";
import { apiError } from "./api-error";
export async function requireSession(request?: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return {
      error: apiError(401, "UNAUTHENTICATED", "Sign in to continue."),
    } as const;
  if (request && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const allowed = new Set([new URL(request.url).origin]);
    if (process.env.NEXTAUTH_URL)
      try {
        allowed.add(new URL(process.env.NEXTAUTH_URL).origin);
      } catch {}
    if (origin && !allowed.has(origin))
      return {
        error: apiError(403, "INVALID_ORIGIN", "This request is not allowed."),
      } as const;
  }
  return { userId: session.user.id } as const;
}
export async function jsonBody(request: Request) {
  try {
    return { body: await request.json() };
  } catch {
    return {
      error: apiError(400, "INVALID_BODY", "Send a valid JSON object."),
    };
  }
}
