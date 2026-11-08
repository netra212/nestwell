"use client";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "lucide-react";
export function SiteHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex min-h-20 max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-4 sm:gap-x-12 px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="Nestwell home"
            className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight text-[#362354]"
          >
            <House className="size-8 fill-[#e9def6] stroke-[1.8]" />
            nestwell<span className="text-primary">.</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="order-3 flex w-full items-center gap-6 text-sm font-semibold sm:order-none sm:w-auto sm:gap-8"
          >
            <Link
              href="/for-sale"
              className="text-primary hover:underline"
              aria-current={pathname === "/for-sale" ? "page" : undefined}
            >
              Buy
            </Link>
            <Link
              href="/for-sale?listingType=RENT"
              className="hover:text-primary"
            >
              Rent
            </Link>
            <span aria-disabled="true" className="text-muted-foreground">
              Sold
            </span>
            <span aria-disabled="true" className="text-muted-foreground">
              Agents
            </span>
          </nav>
          <div className="order-2 ml-auto flex items-center gap-4 text-sm sm:order-none">
            <Link
              href="/saved"
              className="font-semibold text-primary hover:underline"
            >
              Saved
            </Link>
            {status === "loading" ? (
              <span className="text-xs text-muted-foreground">Account…</span>
            ) : session ? (
              <Button
                variant="outline"
                onClick={() => void signOut({ callbackUrl: "/" })}
              >
                Sign out
              </Button>
            ) : (
              <Link
                href="/sign-in"
                className="rounded-lg bg-primary px-4 py-2 font-medium text-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
