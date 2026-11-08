import { redirect } from "next/navigation";
import { getSession, safeCallback } from "@/lib/auth";
import { SignInForm } from "@/components/account/sign-in-form";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const callback = safeCallback(
    typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
  );
  if ((await getSession())?.user.id) redirect(callback);
  return (
    <main id="main-content" className="min-h-[80vh] bg-[#f5f1f9] px-5 py-20">
      <section className="mx-auto max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Make yourself at home
        </p>
        <h1 className="mt-3 text-3xl font-bold">Your next chapter, saved.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Sign in to save homes, keep your searches and contact agents.
        </p>
        <p className="mt-3 rounded-lg bg-accent p-3 text-xs leading-relaxed text-muted-foreground">
          Demo sign-in accepts any email address. Choose Emma Wilson
          (emma.wilson@example.com) or Oliver Taylor (oliver.taylor@example.com)
          to explore the seeded accounts.
        </p>
        <SignInForm callbackUrl={callback} />
      </section>
    </main>
  );
}
