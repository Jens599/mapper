# Mapper

Mapper is a browser-based editor for geographic travel itineraries and
conceptual trails. Travel maps combine OpenStreetMap geography, typed transport
legs, day labels, terrain, and landmarks. Trail sketches use seeded Perlin noise
to control how gently or dramatically paths wind through ordered waypoints.

The application runs entirely in the browser. It has no Python service,
database, or required server runtime and can be deployed as a static Next.js
site.

## Current status

The editor currently includes travel and trail project modes, OpenFreeMap vector
maps, public elevation contours, Perlin trail generation, an SVG symbol library,
YAML editing, IndexedDB autosave, and SVG/PNG export.

See [PLAN.md](./PLAN.md) for the complete roadmap.

## Requirements

- [Bun](https://bun.sh/) 1.3 or newer
- A current Chromium, Firefox, or Safari browser

## Development

Install dependencies and start Next.js:

```bash
bun install
bun dev
```

Open <http://localhost:3000>.

Available checks:

```bash
bun run typecheck
bun run lint
bun test
bun run build
```

## Architecture

- Next.js App Router and strict TypeScript
- Customized shadcn/ui components backed by Radix UI
- Tailwind CSS 4 design tokens
- Zustand and Immer editor state
- Zod project validation
- Static export through `output: "export"`

See [docs/architecture.md](./docs/architecture.md) for boundaries and design
decisions.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [Export contract](./docs/export.md)
- [Open map data](./docs/map-data.md)
- [Project schema](./docs/project-schema.md)
- [Implementation plan](./PLAN.md)

## Deployment

`bun run build` creates a static site in `out/`. The same project can deploy to
Vercel, a Hugging Face Static Space, GitHub Pages, or any static web host.

## License

A project license has not been selected yet. Bundled third-party icons will keep
their upstream Apache-2.0 notices and attribution.

See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for map, elevation,
renderer, and icon attribution.
