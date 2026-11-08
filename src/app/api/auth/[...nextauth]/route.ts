import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
const handler = NextAuth(authOptions);
// Keep the authentication token in a browser-session cookie (JWT expiry still applies).
async function sessionCookie(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  const response: Response = await handler(request, context);
  const cookies = response.headers.getSetCookie();
  response.headers.delete("set-cookie");
  for (let cookie of cookies) {
    const name = cookie.slice(0, cookie.indexOf("="));
    if (
      /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(name) &&
      !/^.*=;(?:\s|$)/.test(cookie)
    )
      cookie = cookie
        .replace(/;\s*Expires=[^;]+/gi, "")
        .replace(/;\s*Max-Age=[^;]+/gi, "");
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
export { sessionCookie as GET, sessionCookie as POST };
