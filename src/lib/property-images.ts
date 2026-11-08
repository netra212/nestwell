const bundledPhotos = new Set([
  "photo-1600596542815-ffad4c1539a9",
  "photo-1600607687939-ce8a6c25118c",
  "photo-1600047509807-ba8f99d2cdde",
  "photo-1600210492486-724fe5c67fb0",
  "photo-1600566753086-00f18fb6b3ea",
  "photo-1600585154340-be6161a56a0c",
  "photo-1600607687920-4e2a09cf159d",
  "photo-1600566753190-17f0baa2a6c3",
]);
const bundledAgents = [
  "Bennett & Clarke",
  "Harrington Homes",
  "Whitmore Estates",
  "Ashworth Property",
  "Pembroke & Co",
];

// The seed keeps its original URLs; render bundled copies for reliable demo browsing.
export function propertyImageSource(src: string) {
  try {
    const url = new URL(src);
    const photo = url.pathname.slice(1);
    if (url.hostname === "images.unsplash.com" && bundledPhotos.has(photo))
      return `/images/properties/${photo}.jpg`;
    const agent = bundledAgents.indexOf(url.searchParams.get("text") || "");
    if (url.hostname === "placehold.co" && agent >= 0)
      return `/images/agents/agent-${agent}.svg`;
  } catch {
    /* Local paths already resolve without a URL base. */
  }
  return src;
}
