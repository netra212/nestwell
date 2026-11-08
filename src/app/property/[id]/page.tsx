import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BedDouble,
  Bath,
  Armchair,
  MapPin,
  Check,
  ArrowLeft,
} from "lucide-react";
import { getProperty } from "@/lib/properties";
import { formatPrice, labelFor } from "@/lib/property-options";
import { PropertyGallery } from "@/components/property/property-gallery";
import { AgentContact } from "@/components/property/agent-contact";
import { similarProperties } from "@/lib/similar-properties";
import { FavoriteButton } from "@/components/property/FavoriteButton";
import { PropertyCard } from "@/components/property/property-card";
import { TrackViewed } from "@/components/property/recently-viewed";
import { Badge } from "@/components/ui/badge";
export const dynamic = "force-dynamic";
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();
  const p = property;
  const similar = await similarProperties(p);
  return (
    <main id="main-content" className="min-h-screen bg-[#faf9fc]">
      <TrackViewed propertyId={p.id} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/for-sale"
          className="mb-7 inline-flex items-center gap-2 text-xs font-medium text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to properties
        </Link>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <PropertyGallery
              images={p.images}
              title={p.title}
              address={`${p.addressLine}, ${p.city}, ${p.postcode}`}
            />
            <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  {p.priceQualifier || "Asking price"}
                </p>
                <p className="text-4xl font-bold tracking-tight">
                  {formatPrice(p.price, p.currency)}
                </p>
              </div>
              <Badge variant="secondary" className="px-3 py-1.5">
                {p.status === "ACTIVE"
                  ? p.listingType === "SALE"
                    ? "For sale"
                    : "To rent"
                  : labelFor(p.status)}
              </Badge>
            </div>
            <div className="mt-5">
              <FavoriteButton
                propertyId={p.id}
                address={p.addressLine}
                property={{
                  ...p,
                  createdAt: p.createdAt.toISOString(),
                  updatedAt: p.updatedAt.toISOString(),
                }}
                showLabel
              />
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">
              {p.title}
            </h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {p.addressLine}, {p.city}, {p.postcode}
            </p>
            <dl className="my-8 grid grid-cols-2 gap-5 rounded-xl border bg-white p-5 sm:grid-cols-4">
              {[
                [BedDouble, "Bedrooms", p.bedrooms],
                [Bath, "Bathrooms", p.bathrooms],
                [Armchair, "Receptions", p.receptions ?? "—"],
              ].map(([Icon, label, value]) => {
                const StatIcon = Icon as typeof BedDouble;
                return (
                  <div key={String(label)}>
                    <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                      <StatIcon className="size-4" />
                      {String(label)}
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">
                      {String(value)}
                    </dd>
                  </div>
                );
              })}
              <div>
                <dt className="text-xs text-muted-foreground">Property type</dt>
                <dd className="mt-2 text-sm font-semibold">
                  {labelFor(p.propertyType)}
                </dd>
              </div>
            </dl>
            <section className="border-t py-7">
              <h2 className="text-xl font-semibold">A closer look</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {p.description}
              </p>
            </section>
            <section className="border-t py-7">
              <h2 className="text-xl font-semibold">What makes it home</h2>
              <ul className="mt-5 grid grid-cols-2 gap-4">
                {p.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    {labelFor(feature)}
                  </li>
                ))}
              </ul>
            </section>
            <section className="mt-3 border-t pt-7">
              <h2 className="mb-5 text-xl font-semibold">Similar properties</h2>
              {similar.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {similar.map((home) => (
                    <PropertyCard
                      key={home.id}
                      property={{
                        ...home,
                        createdAt: home.createdAt.toISOString(),
                        updatedAt: home.updatedAt.toISOString(),
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-white p-6">
                  <p className="text-sm text-muted-foreground">
                    No similar homes are available right now.
                  </p>
                  <Link
                    href={`/for-sale?${new URLSearchParams({ city: p.city, propertyTypes: p.propertyType })}`}
                    className="mt-3 inline-block text-sm text-primary underline"
                  >
                    Explore more homes in {p.city}
                  </Link>
                </div>
              )}
            </section>
          </div>
          <AgentContact agent={p.agent} propertyId={p.id} />
        </div>
      </div>
    </main>
  );
}
