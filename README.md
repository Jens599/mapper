# Mapper

Mapper is a browser-based editor for sketching conceptual trails, terrain,
contours, and landmarks. Routes will follow ordered waypoints while seeded
Perlin noise controls how gently or dramatically they wind.

The application runs entirely in the browser. It has no Python service,
database, or required server runtime and can be deployed as a static Next.js
site.

## Current status

Phase 1 establishes the accessible editor shell, customized shadcn/ui theme,
responsive project rail, versioned project model, sample project, and test
foundation. Route generation, terrain generation, icon placement, YAML editing,
and export are planned in subsequent phases.

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
- [Implementation plan](./PLAN.md)

## Deployment

`bun run build` creates a static site in `out/`. The same project can deploy to
Vercel, a Hugging Face Static Space, GitHub Pages, or any static web host.

## License

A project license has not been selected yet. Bundled third-party icons will keep
their upstream Apache-2.0 notices and attribution.
