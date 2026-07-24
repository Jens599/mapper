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
    icon: city
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
      color: "#216b8b"
    visible: true
iconAssets: []
symbols: []
```

Coordinates are `[longitude, latitude]`. Every leg endpoint must reference an
existing stop, and a leg cannot connect a stop to itself.

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
