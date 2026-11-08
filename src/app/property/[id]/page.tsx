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
  return (
    <main id="main-content" className="min-h-screen bg-[#faf9fc]">
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
            <PropertyGallery images={p.images} title={p.title} />
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
            <section className="mt-3 rounded-xl border border-dashed p-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Similar properties</h2>
                <Badge variant="secondary">Coming soon</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                More places you might love, coming in a future phase.
              </p>
            </section>
          </div>
          <AgentContact agent={p.agent} />
        </div>
      </div>
    </main>
  );
}
