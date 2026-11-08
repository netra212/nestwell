"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export function PageError({ reset }: { reset?: () => void }) {
  return (
    <main
      id="main-content"
      className="mx-auto min-h-[70vh] max-w-xl px-6 py-24 text-center"
    >
      <p className="text-sm font-bold tracking-widest text-primary">
        500 · NESTWELL
      </p>
      <h1 className="mt-4 text-3xl font-bold">We couldn’t load this page.</h1>
      <p className="mt-4 text-muted-foreground">
        Please try again in a moment. Your saved collection will be here when we
        reconnect.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        {reset && (
          <Button onClick={reset} className="h-11 px-5">
            Try again
          </Button>
        )}
        <Link
          href="/"
          className="rounded-lg border px-5 py-3 text-sm text-primary"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
