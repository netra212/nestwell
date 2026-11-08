import { ListingType, PrismaClient, PropertyType, PropertyStatus } from "@prisma/client";
import { z } from "zod";

const db = new PrismaClient();
const cities = [
  { name: "London", postcode: "N1 8AB", latitude: 51.541, longitude: -0.103, base: 475000, roads: ["Rosebery Road", "Clarendon Avenue", "Wilmington Square", "Grove Lane"] },
  { name: "Manchester", postcode: "M20 2WL", latitude: 53.418, longitude: -2.231, base: 175000, roads: ["Burton Road", "Palatine Avenue", "Wilmslow Road", "Beech Lane"] },
  { name: "Birmingham", postcode: "B13 8JP", latitude: 52.447, longitude: -1.888, base: 150000, roads: ["Alcester Road", "Oxford Road", "Cambridge Road", "Church Lane"] },
  { name: "Leeds", postcode: "LS6 3HN", latitude: 53.819, longitude: -1.578, base: 155000, roads: ["Otley Road", "Headingley Avenue", "St Michael's Lane", "Grove Road"] },
  { name: "Bristol", postcode: "BS6 7AB", latitude: 51.477, longitude: -2.601, base: 225000, roads: ["Gloucester Road", "Redland Road", "Chandos Road", "Ashley Avenue"] },
];
const types: PropertyType[] = ["FLAT", "TERRACED", "SEMI_DETACHED", "DETACHED", "MAISONETTE", "STUDIO", "BUNGALOW", "HOUSE"];
const features = ["garden", "parking", "garage", "balcony", "elevator", "furnished", "pet-friendly", "near-transport", "near-schools", "fireplace", "conservatory", "driveway", "central-heating"];
const photos = ["photo-1600596542815-ffad4c1539a9", "photo-1600607687939-ce8a6c25118c", "photo-1600047509807-ba8f99d2cdde", "photo-1600210492486-724fe5c67fb0", "photo-1600566753086-00f18fb6b3ea", "photo-1600585154340-be6161a56a0c", "photo-1600607687920-4e2a09cf159d", "photo-1600566753190-17f0baa2a6c3"];
const openings = ["Bright rooms and a practical layout make this a welcoming home.", "Period character meets thoughtful modern updates throughout this inviting property.", "Set on an established residential street, this home offers comfortable, flexible living space.", "Generous windows bring natural light into the well-proportioned accommodation.", "A carefully presented home with space for both everyday living and entertaining."];
const details = ["The kitchen provides ample storage and a sociable dining area.", "The main living room offers a quiet retreat with room to work from home.", "Bedrooms are arranged away from the main living area for added privacy.", "Local independent shops and cafés provide a lively neighbourhood setting."];
const listingSchema = z.object({ price: z.number().int().min(15000000).max(250000000), bedrooms: z.number().int().min(1).max(6), bathrooms: z.number().int().min(1).max(4), latitude: z.number().min(50).max(55), longitude: z.number().min(-4).max(1), features: z.array(z.enum(features as [string, ...string[]])).min(1) });

async function main() {
  // One transaction serializes concurrent reruns and keeps a failed seed atomic.
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70413001)`;
    const agents = [];
    for (const [i, name] of ["Bennett & Clarke", "Harrington Homes", "Whitmore Estates", "Ashworth Property", "Pembroke & Co"].entries()) {
      const email = `office@${["bennettclarke", "harringtonhomes", "whitmoreestates", "ashworthproperty", "pembrokeco"][i]}.example`;
      const data = { name, email, phone: `0161 496 00${10 + i}`, logoUrl: `https://placehold.co/160x80?text=${encodeURIComponent(name)}` };
      agents.push(await tx.agent.upsert({ where: { email }, create: data, update: data }));
    }
    const properties = [];
    for (let c = 0; c < cities.length; c++) {
      const city = cities[c];
      for (let n = 0; n < 20; n++) {
        const index = c * 20 + n;
        const propertyType = types[n % types.length];
        const bedrooms = propertyType === "STUDIO" ? 1 : propertyType === "FLAT" ? 1 + n % 3 : propertyType === "MAISONETTE" ? 2 + n % 2 : 2 + n % 5;
        const addressLine = `${10 + n * 2} ${city.roads[n % 4]}`;
        const selected = [...new Set(["central-heating", "near-transport", ...features.filter((_, f) => (index + f) % 4 === 0)])].filter(f => !(["STUDIO", "FLAT"].includes(propertyType) && ["garden", "garage", "driveway", "conservatory"].includes(f)));
        const price = (c === 0 && n === 19 ? 2500000 : Math.min(2500000, city.base + (bedrooms - 1) * (c === 0 ? 275000 : 85000) + n * 12500)) * 100;
        const listing = { title: `${bedrooms} bedroom ${propertyType.toLowerCase().replaceAll("_", " ")} on ${city.roads[n % 4]}`, description: `${openings[index % openings.length]} ${details[n % details.length]} ${n % 2 === 0 ? "Nearby transport links make journeys across the city straightforward." : "Parks and everyday amenities are within easy reach."}${n % 3 === 0 ? " Viewing is recommended to appreciate the layout and setting." : ""}`, price, currency: "GBP", priceQualifier: n % 4 === 0 ? "Offers over" : "Guide price", listingType: ListingType.SALE, propertyType, bedrooms, bathrooms: Math.min(4, Math.max(1, Math.ceil(bedrooms / 2))), receptions: bedrooms > 3 ? 2 : 1, addressLine, city: city.name, postcode: city.postcode, country: "UK", latitude: city.latitude + (n % 5 - 2) * 0.002, longitude: city.longitude + (Math.floor(n / 5) - 2) * 0.002, features: selected, agentId: agents[c].id, status: n % 11 === 0 ? PropertyStatus.SOLD : n % 7 === 0 ? PropertyStatus.UNDER_OFFER : PropertyStatus.ACTIVE };
        listingSchema.parse(listing);
        const property = await tx.property.upsert({ where: { addressLine_postcode: { addressLine, postcode: city.postcode } }, create: listing, update: listing });
        properties.push(property);
        const imageCount = 3 + index % 6;
        for (let order = 0; order < imageCount; order++) {
          const image = { url: `https://images.unsplash.com/${photos[(index + order) % photos.length]}?auto=format&fit=crop&w=1200&q=80`, alt: `${["Exterior", "Living space", "Kitchen", "Bedroom", "Dining space", "Garden", "Interior", "Reception room"][order]} — illustrative image for ${addressLine}`, order, propertyId: property.id };
          await tx.propertyImage.upsert({ where: { propertyId_order: { propertyId: property.id, order } }, create: image, update: image });
        }
        await tx.propertyImage.deleteMany({ where: { propertyId: property.id, order: { gte: imageCount } } });
      }
    }
    for (const [i, name] of ["Emma Wilson", "Oliver Taylor"].entries()) {
      const email = `${name.toLowerCase().replace(" ", ".")}@example.com`;
      const user = await tx.user.upsert({ where: { email }, create: { name, email }, update: { name } });
      for (let f = 0; f < 3 + i; f++) {
        const key = { userId: user.id, propertyId: properties[i * 20 + f].id };
        await tx.favorite.upsert({ where: { userId_propertyId: key }, create: key, update: {} });
      }
      for (let s = 0; s <= i; s++) {
        const city = cities[i + s];
        const data = { userId: user.id, name: `${city.name} family homes`, rawQuery: `Homes with a garden in ${city.name} under £750,000`, filters: { city: city.name, listingType: "SALE", maxPrice: 75000000, minBedrooms: 2, features: ["garden"] } };
        await tx.savedSearch.upsert({ where: { userId_name: { userId: user.id, name: data.name } }, create: data, update: data });
      }
    }
  }, { timeout: 120000 });
  console.log({ properties: await db.property.count(), agents: await db.agent.count(), users: await db.user.count(), images: await db.propertyImage.count(), favorites: await db.favorite.count(), savedSearches: await db.savedSearch.count() });
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
