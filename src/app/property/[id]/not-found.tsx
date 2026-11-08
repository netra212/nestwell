import Link from "next/link";
export default function PropertyNotFound() {
  return (
    <main id="main-content" className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-3 text-3xl font-bold">This home couldn’t be found</h1>
      <p className="mt-4 text-muted-foreground">
        The listing may have moved or is no longer available.
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
