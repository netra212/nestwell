import { allowedOrigin } from "./request-security";
import { getSession } from "./auth";
import { apiError } from "./api-error";
export async function requireSession(request?: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return {
      error: apiError(401, "UNAUTHENTICATED", "Sign in to continue."),
    } as const;
  if (request && !["GET", "HEAD"].includes(request.method)) {
    if (!allowedOrigin(request))
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
