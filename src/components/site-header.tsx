"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ArrowUpRight } from "lucide-react";
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex min-h-20 max-w-[1600px] flex-wrap items-center gap-x-12 gap-y-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="Nestwell home"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#362354]"
          >
            <House className="size-8 fill-[#e9def6] stroke-[1.8]" />
            nestwell<span className="text-primary">.</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-6 text-sm font-semibold sm:gap-8"
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
          <span className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            A little closer to home <ArrowUpRight className="size-4" />
          </span>
        </div>
      </header>
    </>
  );
}
