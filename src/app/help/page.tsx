import Link from "next/link";

const sections = [
  {
    title: "Travel maps",
    body: "Use geographic stops and travel legs to build an itinerary over the OpenFreeMap basemap. Solid lines work well for road and rail travel; dashed curves distinguish flights and walking transfers.",
  },
  {
    title: "Trail sketches",
    body: "Switch to Trail sketch for an abstract plane. The winding, noise scale, octaves, warp, modulation, jitter, and smoothing settings produce deterministic Perlin routes through ordered waypoints.",
  },
  {
    title: "Terrain",
    body: "Travel contours and hillshade come from public Mapzen Terrain Tiles hosted in the AWS Open Data Registry. Trail contours are simulated from the project seed and elevation samples.",
  },
  {
    title: "Projects and YAML",
    body: "Mapper autosaves locally in IndexedDB. Save a portable .mapper.yaml file, open one from disk, or use Builder to edit the validated versioned YAML directly.",
  },
  {
    title: "Symbols",
    body: "Choose an Apache-2.0 Carbon symbol or import one or more SVG files. Place it at the project center, scatter twenty seeded copies, then adjust scale and rotation from the object rail.",
  },
  {
    title: "Exports",
    body: "Transparent SVG exports editable overlays without a background. Background SVG embeds the composed map. PNG captures the complete visible composition at double resolution.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-dvh overflow-auto bg-background px-5 py-8 text-foreground sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="focus-ring text-sm font-semibold text-water hover:underline">
          Back to Mapper
        </Link>
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-trail">Field guide</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Map journeys, not just lines.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          Mapper combines real travel geography with a conceptual trail sketchbook. Both modes use the same portable project and export workflow.
        </p>
        <div className="mt-10 divide-y border-y">
          {sections.map((section) => (
            <section key={section.title} className="grid gap-2 py-6 sm:grid-cols-[11rem_1fr]">
              <h2 className="font-bold">{section.title}</h2>
              <p className="leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Basemap data © OpenStreetMap contributors and OpenMapTiles. Elevation data is provided by Mapzen Terrain Tiles.
        </p>
      </div>
    </main>
  );
}
