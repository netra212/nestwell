import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SavedContent } from "@/components/account/saved-content";
export const dynamic = "force-dynamic";
export default async function Saved() {
  if (!(await getSession())?.user.id) redirect("/sign-in?callbackUrl=%2Fsaved");
  return (
    <main id="main-content" className="min-h-screen bg-[#faf9fc]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          A place for your favourites
        </p>
        <h1 className="mt-3 mb-10 text-4xl font-bold">
          Your saved collection.
        </h1>
        <SavedContent />
      </div>
    </main>
  );
}
