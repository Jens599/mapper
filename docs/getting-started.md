# Getting Started

## Open the editor

Run `bun dev`, then open `http://localhost:3000`. Mapper opens the Alder Ridge
sample project so every major layer type has visible context.

## Understand the workspace

The top bar contains project, history, builder, export, theme, and help actions.
The left rail lists project objects in visual stacking order. The remaining area
is the conceptual plane.

On a narrow screen, use the menu button to open project objects in a bottom
sheet. Zoom controls stay over the lower-right corner of the plane.

## Select and hide objects

Choose an object by activating its name in the object rail. The selected row is
visually highlighted and marked with `aria-current` for assistive technology.
Use the switch at the end of a row to show or hide that object.

## Adjust the sample route

Select **Ridge trail**, then adjust:

- **Winding** changes perpendicular route displacement.
- **Noise scale** represents the distance between broad bends.
- **Domain warp** will control distortion of Perlin sample positions.

Every slider has a numeric input. Use the input for exact values or arrow-key
adjustment. Phase 1 uses a lightweight route preview; the seeded Perlin engine
replaces it in Phase 2.

## Navigate the plane

Use the visible minus and plus controls to change zoom. Activate the percentage
or target control to reset the view. Pointer panning, wheel zoom, and coordinate
editing arrive with the geometry editor while visible controls remain available
for keyboard and touch users.

## Theme

The theme button switches between light and dark survey palettes. The selection
is stored in the browser under `mapper-theme`.

## Local data

The current phase uses a bundled sample fixture. Later phases store projects in
IndexedDB and provide YAML files for portable save and load. No project data is
sent to a server.
