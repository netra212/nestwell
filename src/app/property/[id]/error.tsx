"use client";
import { PageError } from "@/components/states/PageError";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <PageError reset={reset} />;
}
