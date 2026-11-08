"use client";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
const SaveSearchDialog = dynamic(
  () => import("./SaveSearchDialog").then((m) => m.SaveSearchDialog),
  { ssr: false },
);
export function SaveSearchButton({ query }: { query: string }) {
  const { data: session } = useSession();
  return session ? <SaveSearchDialog query={query} /> : null;
}
