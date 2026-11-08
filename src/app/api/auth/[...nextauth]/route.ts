import { NextResponse } from "next/server";
import { authMutationSchema, allowedOrigin } from "@/lib/request-security";
import { takeAuthRequest } from "@/lib/auth-rate-limit";
import { clientIP } from "@/lib/search/rateLimit";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
const handler = NextAuth(authOptions);
// Keep the authentication token in a browser-session cookie (JWT expiry still applies).
async function sessionCookie(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  const reject = (
    status: number,
    code: string,
    message: string,
    details: unknown[] = [],
  ) =>
    NextResponse.json(
      {
        url: new URL(
          `/sign-in?error=${status === 429 ? "RateLimited" : "CredentialsSignin"}`,
          request.url,
        ).href,
        error: { code, message, details },
      },
      { status },
    );
  if (request.method === "POST" && !allowedOrigin(request))
    return reject(403, "INVALID_ORIGIN", "This request is not allowed.");
  const rate = takeAuthRequest(
    clientIP(request.headers),
    request.method === "POST",
  );
  if (!rate.allowed) {
    const response = reject(
      429,
      "RATE_LIMITED",
      "Too many sign-in requests. Try again in a minute.",
    );
    response.headers.set("Retry-After", String(rate.retryAfter));
    return response;
  }
  if (request.method === "POST") {
    try {
      const copy = request.clone();
      const content = await copy.text();
      if (content.length > 16384)
        return reject(413, "BODY_TOO_LARGE", "This request is too large.");
      const body = request.headers
        .get("content-type")
        ?.includes("application/json")
        ? JSON.parse(content)
        : Object.fromEntries(new URLSearchParams(content));
      const parsed = authMutationSchema.safeParse(body);
      if (!parsed.success)
        return reject(
          400,
          "INVALID_BODY",
          "Check your sign-in details.",
          parsed.error.issues,
        );
      const { nextauth } = await context.params;
      if (
        nextauth[0] === "callback" &&
        nextauth[1] === "credentials" &&
        !parsed.data.email
      )
        return reject(400, "INVALID_BODY", "Enter a valid email address.");
    } catch {
      return reject(400, "INVALID_BODY", "Send valid sign-in details.");
    }
  }
  const response: Response = await handler(request, context);
  const cookies = response.headers.getSetCookie();
  response.headers.delete("set-cookie");
  for (let cookie of cookies) {
    const name = cookie.slice(0, cookie.indexOf("="));
    if (
      /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(name) &&
      cookie.slice(cookie.indexOf("=") + 1).split(";")[0] !== ""
    )
      cookie = cookie
        .replace(/;\s*Expires=[^;]+/gi, "")
        .replace(/;\s*Max-Age=[^;]+/gi, "");
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
export { sessionCookie as GET, sessionCookie as POST };
