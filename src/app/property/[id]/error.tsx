"use client";
import { Button } from "@/components/ui/button";
export default function PropertyError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">We couldn’t load this home</h1>
      <p className="mt-4 text-muted-foreground">
        Please try again in a moment.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </main>
  );
}
