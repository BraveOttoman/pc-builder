# RigForge — 3D PC Builder

Pick parts and watch them fly into a live 3D case. RigForge checks compatibility and power, estimates FPS, and syncs ARGB lighting across every fan, RAM stick and strip.

## Run it

```
npm run dev
```

Then open http://localhost:5180. Requires Node 18+. There are no dependencies to install. Three.js and the fonts load from CDNs, so you need an internet connection.

## Features

- **Procedural 3D rig** (Three.js): the case, board, CPU, air or AIO cooler, RAM, GPU, NVMe, PSU, fans and sleeved cables are all generated in code. There are no model files.
- **Cinematic intro**: parts assemble one by one, then the PC "POSTs" with an RGB sweep from bottom to top.
- **Effects**: bloom, environment reflections, soft shadows, install bursts, floating dust, a glowing floor ring and HUD-style glass panels.
- **Interactions**: drag to orbit and scroll to zoom. Hover a part in 3D to see its name, and click it to swap it.
- **Controls**: Power (P), Explode (E), Orbit (R), View (V), Sound (M), and 1–9 to jump between categories.
- **Lighting**: colour swatches or a custom colour, with Static, Breathe, Rainbow, Pulse and Off modes.
- **Compatibility**: checks socket, memory type, form factor, GPU length, cooler height, radiator support, cooler wattage and PSU headroom. Incompatible parts still render, so you can see a GPU clipping through a small case.
- **Estimates**: power draw gauge, plus FPS at 1080p, 1440p and 4K with a bottleneck hint.
- **Sharing**: builds save to localStorage and to the URL, and the Share button copies the link.
- **Responsive**: on phones the panels become bottom sheets.

## Files

| File | What it does |
| --- | --- |
| `js/parts.js` | Parts catalog, presets, spec chips. Prices are sample values. |
| `js/compat.js` | Compatibility rules, wattage, FPS model |
| `js/scene.js` | Three.js scene: geometry builders, RGB controller, explode, camera |
| `js/main.js` | UI, state, persistence, intro sequence |
| `js/audio.js` | Synthesized UI sounds (WebAudio, no files) |

## Adding a part

Add an entry to the right array in `js/parts.js`, using the same fields as its siblings. The 3D builder reads the dimensions from those fields: `length`/`slots`/`fans` for GPUs, `height` or `rad` for coolers, `sticks`/`rgb` for RAM, and so on. The new part renders automatically.
