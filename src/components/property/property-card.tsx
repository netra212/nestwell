"use client";
import Link from "next/link";
import { Bath, BedDouble, Heart, Armchair, ArrowUpRight } from "lucide-react";
import { PropertyImage } from "./property-image";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatPrice, labelFor } from "@/lib/property-options";
import type { PropertyResult } from "@/lib/property-types";
import { cn } from "@/lib/utils";

export function PropertyCard({
  property: p,
  view = "grid",
  priority = false,
}: {
  property: PropertyResult;
  view?: "grid" | "list";
  priority?: boolean;
}) {
  const href = `/property/${p.id}`;
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-md",
        view === "list" && "sm:flex",
      )}
    >
      <div
        className={cn(
          "relative aspect-[1.55] shrink-0 overflow-hidden bg-muted",
          view === "list" && "sm:aspect-auto sm:w-[38%] sm:min-h-64",
        )}
      >
        <Link
          href={href}
          aria-label={`View ${p.title}`}
          className="block h-full"
        >
          <PropertyImage
            src={p.images[0]?.url || "/property-placeholder.svg"}
            alt={p.images[0]?.alt || p.title}
            fill
            sizes={
              view === "list"
                ? "(max-width: 640px) 100vw, 400px"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        </Link>
        <span className="absolute top-3 left-3 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#44344f] uppercase">
          {p.status === "ACTIVE"
            ? p.listingType === "SALE"
              ? "For sale"
              : "To rent"
            : labelFor(p.status)}
        </span>
        <Button
          aria-label={`Save ${p.addressLine}`}
          variant="secondary"
          size="icon"
          className="absolute top-3 right-3 rounded-full bg-white/95"
          onClick={() =>
            toast({
              title: "Make yourself at home",
              description: "Saving properties is coming in Phase 5.",
            })
          }
        >
          <Heart className="size-4" />
        </Button>
        <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white">
          Illustrative photo
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 p-5">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {p.priceQualifier ||
              (p.listingType === "RENT" ? "Rental price" : "Asking price")}
          </p>
          <Link
            href={href}
            className="mt-1 inline-block text-[26px] leading-tight font-bold tracking-tight hover:text-primary"
          >
            {formatPrice(p.price, p.currency)}
          </Link>
          <h2 className="mt-3 truncate text-sm font-semibold">
            <Link href={href}>{p.addressLine}</Link>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {p.city}, {p.postcode}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {labelFor(p.propertyType)}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-[#544b60]">
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-4" />
              {p.bedrooms}
              <span className="sr-only"> bedrooms</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Bath className="size-4" />
              {p.bathrooms}
              <span className="sr-only"> bathrooms</span>
            </span>
            {p.receptions !== null && (
              <span className="flex items-center gap-1.5">
                <Armchair className="size-4" />
                {p.receptions}
                <span className="sr-only"> receptions</span>
              </span>
            )}
          </div>
          {view === "list" && (
            <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {p.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5 border-t bg-[#fcfbfd] px-5 py-3">
          <AgentLogo name={p.agent.name} logoUrl={p.agent.logoUrl} />
          <span className="truncate text-[11px] font-medium text-[#675b73]">
            {p.agent.name}
          </span>
          <Link
            href={href}
            aria-label={`View details for ${p.addressLine}`}
            className="ml-auto text-primary"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function AgentLogo({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  return (
    <span className="relative inline-flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded border bg-white text-[10px] font-bold text-primary">
      {logoUrl ? (
        <PropertyImage
          src={logoUrl}
          alt={`${name} logo`}
          fill
          sizes="48px"
          className="object-contain"
          unoptimized
        />
      ) : (
        name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
      )}
    </span>
  );
}
