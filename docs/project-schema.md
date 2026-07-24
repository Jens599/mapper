# Project Schema

Mapper YAML is validated by Zod before it enters editor state. Version 2 is a
discriminated union selected by the `kind` field.

## Travel project

```yaml
version: 2
kind: travel
id: nepal-journey
name: Nepal journey
durationDays: 10
subtitle: Kathmandu and the Annapurna foothills
map:
  display: geographic
  style: positron
  showContours: true
  showHillshade: true
  contourInterval: 100
  elevationUnits: m
stops:
  - id: kathmandu
    name: Kathmandu
    coordinates: [85.324, 27.7172]
    dayLabel: DAY 1
    icon: carbon-hotel
    visible: true
  - id: pokhara
    name: Pokhara
    coordinates: [83.9856, 28.2096]
    dayLabel: DAY 2
    icon: carbon-mountain
    visible: true
legs:
  - id: kathmandu-pokhara
    name: Kathmandu to Pokhara
    from: kathmandu
    to: pokhara
    mode: flight
    via: []
    style:
      line: dashed
      curvature: 0.24
      winding: 0
      noiseSeed: 42
      noiseAmplitude: 0.18
      noiseScale: 2
      noiseOctaves: 3
      noiseModulation: 0.25
      color: "#216b8b"
    visible: true
iconAssets: []
symbols: []
scatter:
  - id: mountain-band
    name: Mountains along the top
    iconId: carbon-mountain
    seed: 42
    count: 24
    minSpacingKm: 8
    region:
      type: map-edge
      edge: north
      band: 0.18
      padding: 0.05
    appearance:
      scale: [0.7, 1.3]
      rotation: [-8, 8]
    visible: true
```

Coordinates are `[longitude, latitude]`. Every leg endpoint must reference an
existing stop, and a leg cannot connect a stop to itself.

Leg line styles are `solid`, `dashed`, or `dotted`. Curvature, winding, and the
seeded Perlin fields belong to each leg. The editor can copy route-shape settings
to every leg without changing each leg's line style or color. A stop's `icon`
references a Carbon or imported icon ID.

Set `map.display` to `symbolic` to keep itinerary stops, transport modes, day
labels, and route styling while replacing geographic placement with the editor's
**No map** presentation: an
automatically spaced, not-to-scale diagram. Geographic coordinates remain in the
project so switching back does not lose data.

Each item under `scatter` is one reproducible rule, regardless of generated icon
count. Change `seed` to create another arrangement. Travel regions include
`trip-bounds`, `map-edge`, `around-stop`, `along-leg`, and explicit `bounds`.
Trail projects provide `canvas`, `canvas-edge`, `around-waypoint`, `along-route`,
and `rectangle` regions. Minimum spacing uses rejection sampling, and generated
icons avoid named stops or waypoints.

## Trail project

```yaml
version: 2
kind: trail
id: ridge-trail
name: Ridge trail
units: m
canvas:
  width: 1000
  height: 700
  background: "#e9efeb"
  showGrid: true
terrain:
  visible: true
  seed: 42
  contourInterval: 20
  opacity: 0.52
waypoints:
  - id: trailhead
    name: Trailhead
    x: 120
    y: 570
    elevation: 220
    visible: true
  - id: summit
    name: Summit
    x: 820
    y: 180
    elevation: 940
    visible: true
routes: []
icons: []
iconAssets: []
```

Trail route noise includes seed, amplitude, wavelength, octaves, persistence,
lacunarity, domain warp, amplitude modulation, random jitter, and smoothing.
Generated displacement fades to zero at waypoints.

## Imported SVGs

Imported SVG assets are sanitized and embedded in `iconAssets`, making project
files portable. Placements reference the asset ID and retain scale, rotation,
position, and visibility.
