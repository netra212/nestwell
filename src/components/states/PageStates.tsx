import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
export function PageLoading({
  label = "Loading your next chapter…",
}: {
  label?: string;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto min-h-[70vh] max-w-7xl px-6 py-14"
    >
      <p
        role="status"
        aria-live="polite"
        className="mb-7 text-sm text-muted-foreground"
      >
        {label}
      </p>
      <Skeleton className="mb-6 h-10 w-2/3 max-w-lg" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-80 rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
export function NotFoundState() {
  return (
    <main
      id="main-content"
      className="mx-auto min-h-[70vh] max-w-xl px-6 py-24 text-center"
    >
      <p className="text-sm font-bold tracking-widest text-primary">
        404 · NESTWELL
      </p>
      <h1 className="mt-4 text-3xl font-bold">
        This address couldn’t be found.
      </h1>
      <p className="mt-4 text-muted-foreground">
        There are plenty of other places to call home.
      </p>
      <Link
        href="/for-sale"
        className="mt-8 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white"
      >
        Explore properties
      </Link>
    </main>
  );
}
