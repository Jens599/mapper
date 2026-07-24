# Mapper Implementation Plan

## 1. Product Definition

Mapper is a browser-based conceptual trail-design editor. Users arrange named
places on an abstract plane, connect ordered waypoints with generated paths,
shape those paths with layered Perlin noise, add conceptual elevation and
contours, place or scatter SVG symbols, and export the resulting composition.

The application is a client-only Next.js app. Generation, editing, persistence,
and export run in the browser so the production build can be deployed as a free
static site without a Python service, database, or server runtime.

### Primary audience

- Trail planners producing early concept diagrams.
- Game and map designers sketching routes and landmarks.
- Writers and world builders arranging locations without surveyed coordinates.

### Product boundaries

- Coordinates and contours are conceptual, not GIS- or survey-grade data.
- User-entered elevation samples influence the generated terrain but do not
  claim real-world accuracy.
- The initial release has local projects only. Accounts, collaboration, and
  cloud persistence are out of scope.

## 2. Technology

### Application foundation

- Next.js App Router, React, and strict TypeScript.
- Bun for package management and project scripts.
- Tailwind CSS 4 for tokens and application styling.
- Customized shadcn/ui components backed by Radix UI primitives.
- React Konva for the interactive drawing surface.
- Zustand with Immer for editor state, history, and undo/redo.
- Zod for runtime project validation and migrations.
- Dexie for IndexedDB autosave and recent projects.

### Editing and generation

- `noisejs` for deterministic seeded Perlin noise.
- d3-shape for smooth reference curves.
- d3-contour for elevation contour extraction.
- ELK.js for automatic layout of relative place relationships.
- CodeMirror 6 and `yaml` for the code-driven project editor.
- Apache-2.0 icon sources, initially Google Material Symbols and IBM Carbon
  Icons, with their required license and attribution files.

### Quality

- ESLint and TypeScript for static checks.
- Vitest and Testing Library for units and components.
- Playwright for browser workflows and export checks.
- axe-core integration for automated accessibility checks.

## 3. Experience Direction

The editor takes interaction inspiration from Desmos without copying its visual
identity. A narrow object rail makes every visible item inspectable, reorderable,
and directly editable while the plane remains the dominant workspace.

### Layout

- Desktop: resizable object rail on the left, uninterrupted canvas on the right.
- Tablet: collapsible rail with an always-visible canvas toolbar.
- Mobile: canvas-first composition with a draggable bottom sheet for objects and
  properties.
- YAML builder: a resizable editor pane with validation diagnostics and live
  preview.

### Visual system

- A cool survey-fieldbook palette rather than the stock shadcn theme.
- Graphite neutrals for structure, moss for terrain, blue for water-related
  symbols, and trail orange for the active route.
- Atkinson Hyperlegible for interface text and IBM Plex Mono for coordinates,
  measurements, seeds, and generated values.
- Compact six-pixel radii, clear dividers, restrained shadows, and strong focus
  indicators.
- Light, dark, high-contrast, forced-colors, and reduced-motion behavior.
- Contour lines form the distinctive visual signature and remain quiet enough
  that routes and selected objects retain priority.

### Customized shadcn/ui

shadcn/ui is a source-code foundation, not an off-the-shelf theme. Components
will be adapted to the editor's density and interaction model while preserving
Radix semantics and keyboard behavior.

- Object rows combine visibility, object type, name, and a contextual menu.
- Sliders always have an associated numeric input for precision and keyboard use.
- Tooltips are supplemental; every action has a visible label or accessible name.
- Dialogs are reserved for blocking choices. Routine properties remain inline.
- Toasts report completed actions; validation and generation errors remain near
  the responsible control.
- A command palette exposes tools, objects, import, export, and view commands.

## 4. Core Editing Model

### Objects and layers

- Project settings and canvas bounds.
- Ordered waypoint collections.
- Smooth joined routes and independent route segments.
- Elevation samples with user-entered values.
- Generated terrain fields and contour layers.
- Individually placed SVG icons.
- Reproducible icon scatter groups.
- Rectangular and polygonal scatter or terrain regions.

Every object has a stable ID, name, visibility, locked state, z-order, style,
and object-specific properties. Generated objects retain their source parameters
instead of becoming disconnected drawing output.

### Canvas interactions

- Pointer, touch, trackpad, and keyboard pan and zoom.
- Visible zoom in, zoom out, reset view, and fit-to-content controls.
- Selection, multi-selection, drag, duplicate, reorder, lock, and delete.
- Grid and object snapping with temporary modifier-key overrides.
- Keyboard movement with coarse and fine increments.
- Context actions available through both pointer menus and the object rail.
- Optional rulers, grid, axes, scale bar, and export bounds overlay.

### History and recovery

- Transaction-based undo and redo.
- IndexedDB autosave after stable edits.
- Recovery prompt after an interrupted session.
- Explicit new, open, save, save as, and recent-project actions.
- Deterministic seeds persisted with every generated layer.

## 5. Route Generation

### Reference paths

- Independent mode generates each waypoint pair separately.
- Joined mode constructs one smooth reference path through all ordered waypoints.
- Generated displacement is applied along the local path normal.
- Endpoint falloff forces displacement to zero at required waypoints.

### Noise controls

- Seed.
- Wavelength and displacement amplitude as separate controls.
- Sample density.
- Octaves, persistence, and lacunarity.
- Perlin domain-warp strength and wavelength.
- Perlin amplitude-modulation strength and wavelength.
- Seeded random jitter strength.
- Smoothing and maximum bend.
- Endpoint falloff distance.

Changing a value regenerates a preview without losing source waypoints. Expensive
updates use deferred rendering and complete as one undoable transaction.

### Route measurements

- Direct waypoint distance.
- Generated route length.
- Sinuosity: generated length divided by direct distance.
- Sample spacing and conceptual units.
- Warnings for excessive bends or self-intersections.

## 6. Terrain and Contours

- Generate a conceptual elevation raster from layered seeded Perlin noise.
- Let users place elevation samples and enter explicit elevations.
- Blend samples into the synthetic field with distance-weighted interpolation.
- Import elevation samples from CSV columns `x`, `y`, and `elevation`.
- Configure terrain seed, resolution, base elevation, range, roughness, and blend.
- Extract contours at a configurable interval using d3-contour.
- Use a perceptually uniform sequential terrain scale when raster shading is
  enabled; do not use a rainbow scale.
- Label contour elevations at useful intervals without excessive repetition.
- Identify contours as conceptual in the interface and exported metadata.

## 7. Icons and Scatter

### Icon sources

- Searchable bundled Apache-2.0 icon catalog drawn from Material Symbols and
  Carbon Icons.
- Import individual SVG files, multiple SVG files, a directory where browser
  support permits it, or a ZIP archive.
- Sanitize imported SVG before parsing or rendering it.
- Store imported icon definitions inside the project file when portability is
  requested.

### Placement

- Click or drag to place an icon.
- Edit position, uniform scale, rotation, opacity, color override, and label.
- Preserve original SVG aspect ratio by default.

### Scatter

- Scatter a selected icon inside a rectangle or polygon, around a place, or along
  a route.
- Configure count or density, seed, minimum spacing, scale range, rotation range,
  and route exclusion distance.
- Regenerate from parameters without manually deleting previous symbols.
- Make dense groups selectable as one object while permitting expansion into
  individual icons when required.

## 8. Relative YAML Builder

The YAML builder provides code-driven composition without requiring accurate
coordinates. It supports named places, relative directions, approximate
distance, alignment, grouping, routes, terrain, and scatter rules.

```yaml
version: 1
canvas:
  units: m
  seed: 42

places:
  - id: camp
    icon: material/camping
    at: [0, 0]

  - id: lake
    icon: material/water
    east_of: camp
    distance: 300

  - id: lookout
    icon: carbon/binoculars
    north_of: lake
    distance: 180

routes:
  - id: ridge-trail
    through: [camp, lake, lookout]
    mode: smooth
    noise:
      seed: 81
      wavelength: 90
      amplitude: 28
      octaves: 3
      warp_strength: 0.35

scatter:
  - icon: carbon/tree
    around: lake
    count: 35
    radius: 160
    seed: 12
```

The layout engine resolves explicit anchors first, then relative constraints,
then unconstrained nodes. It applies collision spacing after graph layout and
reports contradictory or unresolved relationships instead of silently choosing
arbitrary positions.

## 9. Import, Persistence, and Export

### Project files

- YAML is the user-facing editable project format.
- Zod validates loaded projects and provides actionable path-based errors.
- The schema includes a required version for future migrations.
- Projects can embed imported SVG assets or reference bundled icon IDs.
- IndexedDB stores working copies, thumbnails, and recent-file metadata.

### Export bounds

Users can export the full canvas, visible viewport, current selection, or a
custom export frame. Every mode previews its exact bounds before generation.
Exports support padding, output dimensions, scale multiplier, and file name.

### Required export modes

1. **SVG, transparent background**
   - Contains routes, contours, icons, labels, and other enabled content.
   - Emits no canvas background rectangle or background style.
   - Preserves vector paths and text where practical.
   - Uses a correct `viewBox` based on the selected export bounds.

2. **SVG, with background**
   - Contains the same enabled content as transparent SVG.
   - Adds a bounds-sized background rectangle as the first visual element.
   - Supports the current canvas background or a user-selected solid color.
   - Optionally includes the visible grid when explicitly enabled for export.

3. **PNG**
   - Rasterizes the selected bounds at 1x, 2x, 3x, or a custom scale.
   - Supports transparent or solid-color background.
   - Reports output pixel dimensions before download.
   - Avoids clipping strokes, labels, shadows, and rotated icons at the bounds.

### Additional exports

- Route coordinates as CSV.
- Elevation samples as CSV.
- Project snapshot as YAML.
- Optional JSON matching the validated internal schema for integrations.

## 10. Accessibility

The target is WCAG 2.2 AA for application controls and essential editor tasks.

- All tools and properties are keyboard reachable.
- The canvas has a parallel semantic object list; hundreds of canvas marks are
  not individually inserted into the tab order.
- Selected object position and changes are announced through a polite live region.
- Coordinate and route values are available as semantic tables.
- Color never acts as the only indicator for selection, status, or layer type.
- Text meets 4.5:1 contrast and meaningful non-text graphics target 3:1 contrast.
- Pointer targets meet at least 24 by 24 CSS pixels, with larger mobile targets.
- Hover information is also available by focus and touch.
- Reduced-motion mode removes nonessential interpolation and animation.
- Forced-colors mode preserves borders, focus, selection, and disabled states.
- The interface reflows at 320 CSS pixels without removing essential controls.

## 11. Performance

- Keep pointer interaction at a responsive frame rate by separating preview and
  committed generation quality.
- Move high-resolution terrain and contour generation to a Web Worker when main
  thread profiling shows meaningful blocking.
- Cache generated paths by stable parameter hash.
- Virtualize large icon catalogs and long object lists.
- Render dense scatter groups efficiently while retaining a semantic group entry.
- Do not regenerate unrelated layers when one object's parameters change.

## 12. Documentation

Detailed documentation lives in `docs/` and is exposed through an in-app help
area built from MDX. Documentation will include:

- Installation and Bun commands.
- Editor quick start.
- Waypoint and route workflow.
- Every noise parameter with visual examples.
- Terrain, elevation samples, and contour limitations.
- Icon licensing, importing, placement, and scatter.
- YAML schema reference and complete examples.
- Export modes and print/vector workflow.
- Keyboard shortcut reference.
- Accessibility features.
- Static deployment to Hugging Face Spaces, GitHub Pages, and Vercel.
- Architecture, state model, algorithms, testing, and contribution guide.
- Troubleshooting and browser-support notes.

## 13. Delivery Phases

### Phase 1: Foundation

- Establish application tokens and customized shadcn/ui primitives.
- Define versioned Zod project schema and example fixtures.
- Set up Vitest, Testing Library, Playwright, and axe checks.
- Implement the responsive editor shell and accessible object rail.

### Phase 2: Geometry engine

- Implement seeded noise and all transformation modes.
- Implement independent and joined route generation.
- Add endpoint locking, smoothing, measurements, and deterministic tests.
- Implement viewport transforms and editor selection.

### Phase 3: Terrain and symbols

- Implement elevation fields, samples, CSV import, and contours.
- Integrate Apache-licensed icon catalogs and license notices.
- Add SVG sanitization, placement, transform, and scatter workflows.

### Phase 4: Builder and persistence

- Implement YAML parsing, diagnostics, live preview, and formatting.
- Implement relative layout and contradiction reporting.
- Add IndexedDB autosave, recovery, history, and project file workflows.

### Phase 5: Export and documentation

- Implement transparent SVG, background SVG, and PNG export modes.
- Add bounds, padding, dimensions, scale, and export previews.
- Add CSV and YAML exports.
- Complete user, schema, algorithm, accessibility, and deployment documentation.

### Phase 6: Hardening and deployment

- Validate keyboard-only and touch workflows.
- Test 320 px, tablet, desktop, high contrast, and reduced motion.
- Profile large routes, terrain fields, and scatter groups.
- Run lint, type checks, unit tests, browser tests, and production build.
- Configure `output: "export"` and publish to a free static host.

## 14. Initial Acceptance Criteria

- A user can create at least three waypoints and generate either route mode.
- Noise scale, amplitude, domain warp, modulation, and random jitter visibly and
  reproducibly alter the route.
- Generated paths pass through required waypoints.
- A user can add elevations and display generated contour lines.
- A user can place, scale, rotate, and scatter a selected SVG icon.
- A relative YAML example lays itself out without exact coordinates.
- Undo, redo, autosave, YAML save/load, and seed reproducibility work.
- Transparent SVG has no background element.
- Background SVG begins with a correctly sized background rectangle.
- PNG exports at the requested dimensions and background setting.
- Core creation and export tasks are keyboard operable.
- The static production build runs without a server or Python dependency.
