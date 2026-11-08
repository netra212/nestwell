import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [properties, agents, users] = await db.$transaction([
    db.property.count(), db.agent.count(), db.user.count(),
  ]);
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Database health</h1>
      <p className="mt-4 font-medium text-emerald-700">ok</p>
      <dl className="mt-8 grid grid-cols-3 gap-4">
        {Object.entries({ properties, agents, users }).map(([name, count]) => (
          <div key={name} className="rounded-lg border p-5">
            <dt className="capitalize text-muted-foreground">{name}</dt>
            <dd className="mt-2 text-3xl font-semibold">{count}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
