import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { HomeSearch } from "@/components/search/home-search";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyImage } from "@/components/property/property-image";
export const dynamic = "force-dynamic";
export default async function Home() {
  const featured = await db.property.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ price: "desc" }, { id: "asc" }],
    take: 6,
    include: {
      agent: { select: { name: true, logoUrl: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
    },
  });
  return (
    <main id="main-content" className="bg-[#faf9fc]">
      <section className="overflow-hidden border-b bg-[#f2edf7]">
        <div className="mx-auto grid max-w-[1500px] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.3fr_1fr]">
          <div className="relative z-10">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dcd0e9] bg-white/60 px-3 py-1.5 text-[10px] font-semibold tracking-[.16em] text-primary uppercase">
              <Sparkles className="size-3" />A more natural way to find home
            </p>
            <h1 className="max-w-2xl text-5xl leading-[1.08] font-bold tracking-[-.04em] text-[#30203f] sm:text-6xl">
              Your next home.
              <br />
              In your own <span className="text-primary">words.</span>
            </h1>
            <p className="mt-6 mb-8 max-w-lg text-base leading-7 text-[#756582]">
              A garden for Sunday mornings. Room for a growing family. A shorter
              walk to the station. Tell us what home looks like to you.
            </p>
            <HomeSearch />
            <p className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Check className="size-3 text-primary" />
              Smart search, with simple filters whenever you need them.
            </p>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative aspect-[.95] overflow-hidden rounded-t-[140px] rounded-b-3xl">
              <PropertyImage
                src="/images/properties/photo-1600596542815-ffad4c1539a9.jpg"
                alt="A welcoming modern home surrounded by a garden"
                fill
                priority
                sizes="(max-width: 1200px) 40vw, 550px"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -left-8 rounded-xl border bg-white px-6 py-4 shadow-md">
              <p className="text-[10px] font-bold tracking-widest text-primary uppercase">
                Less scrolling. More belonging.
              </p>
              <p className="mt-2 text-sm text-[#63516e]">
                Find the details that feel like you.
              </p>
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1500px] px-5 py-12 sm:px-8">
        <section aria-labelledby="popular-heading">
          <div className="flex items-center justify-between">
            <h2 id="popular-heading" className="text-xl font-bold">
              A good place to start
            </h2>
            <span className="text-xs text-muted-foreground">
              Popular searches
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [
                "City life, your way",
                "Modern flat in Manchester with a balcony",
              ],
              [
                "Room to grow",
                "Family home near schools in Bristol under £450k",
              ],
              ["A quieter corner", "Quiet home with garden in Leeds"],
            ].map(([title, q]) => (
              <Link
                key={q}
                href={`/for-sale?${new URLSearchParams({ q })}`}
                className="group flex items-center justify-between gap-4 rounded-xl border bg-white p-5 hover:border-primary/40"
              >
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{q}</p>
                </div>
                <ArrowUpRight className="size-5 shrink-0 text-primary transition group-hover:-translate-y-1" />
              </Link>
            ))}
          </div>
        </section>
        <section aria-labelledby="featured-heading" className="mt-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-widest text-primary uppercase">
                Something special
              </p>
              <h2 id="featured-heading" className="text-2xl font-bold">
                Homes worth a closer look
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Featured listings from our active collection.
              </p>
            </div>
            <Link
              href="/for-sale"
              className="flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Explore all
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PropertyCard
                key={p.id}
                property={{
                  ...p,
                  createdAt: p.createdAt.toISOString(),
                  updatedAt: p.updatedAt.toISOString(),
                }}
              />
            ))}
          </div>
        </section>
        <footer className="mt-14 border-t py-8 text-center text-xs text-muted-foreground">
          A new home. A fresh start. A little more you.{" "}
          <span className="font-semibold text-primary">nestwell.</span>
        </footer>
      </div>
    </main>
  );
}
