import { randomBytes } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "./db";
const globals = globalThis as unknown as { nestwellAuthSecret?: string };
const secret =
  process.env.NEXTAUTH_SECRET?.trim() ||
  (globals.nestwellAuthSecret ??= randomBytes(32).toString("hex"));
export const authOptions: NextAuthOptions = {
  secret,
  session: { strategy: "jwt", maxAge: 86400 },
  pages: { signIn: "/sign-in" },
  providers: [
    CredentialsProvider({
      name: "Demo email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Demo password", type: "password" },
      },
      async authorize(credentials) {
        const email = z
          .email()
          .max(254)
          .safeParse(credentials?.email?.trim().toLowerCase());
        if (!email.success) return null;
        const user = await db.user.upsert({
          where: { email: email.data },
          update: {},
          create: { email: email.data, name: email.data.split("@")[0] },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string")
        session.user.id = token.userId;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && !url.startsWith("//"))
        return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {}
      return baseUrl;
    },
  },
};
export const getSession = () => getServerSession(authOptions);
export function safeCallback(value: string | null | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f]/.test(value)
    ? value
    : "/saved";
}
