# Digital Cosmos

**A complete universe simulator in a single HTML file.**

No frameworks. No build tools. No dependencies. Just open `index.html` in a browser.

---

## What is this?

An interactive universe simulator that evolved through 70 iterations — from a simple particle system into a complete cosmos with physics, astronomy, biology, civilization, philosophy, music, poetry, self-awareness, and everything in between.

**4672 lines | 253 functions | 308KB | 84 achievements | 60 FPS | 0 dependencies**

## Quick Start

```
open index.html
```

Or serve it:
```
python3 -m http.server 8765
# visit http://localhost:8765/index.html
```

Or embed it:
```html
<iframe src="index.html?embed=1" width="800" height="600"></iframe>
```

Or link with settings:
```
index.html#theme=2&audio=1&screensaver=1
```

## Controls

| Key | Action |
|-----|--------|
| `1-9` | Interaction modes (attract, repel, orbit, nebula, blackhole, wormhole, comet, pulsar, planet) |
| `-` | Gravity brush | `[` | Slingshot | `'` | Draw constellation |
| `B` Big Bang | `S` Supernova | `V` Galaxy | `K` Collision | `J` Binary |
| `A` Audio | `Z` Zen | `F` Cinema | `F2` Photo mode | `P` Screenshot |
| `Space` Pause | `?` Shortcuts | `0` Reset camera | Scroll Zoom |
| Right-click | Creator powers | Middle-click | Radial quick menu |
| Double-click | Focus | `ESC` Exit overlays |

## Systems

### Physics & Astronomy
N-body gravity, spacetime fabric, quantum entanglement, gravity brush/slingshot, 6 star classes with blackbody colors, stellar lifecycle, binary stars, planets with moons/rings/atmospheres, nebulae (procedural noise), black holes with lensing/interior, pulsars, comets, asteroid belts, constellations (auto + manual), orbit predictions, gravitational potential fields, cosmic weather, parallax starfield, star twinkle

### Biology & Civilization
8-stage life evolution, habitable zones, civilizations with radio signals, first contact, trade routes, warp gates, Dyson spheres, interstellar ships, ruin excavation/artifacts, the Great Filter, cosmic mind consciousness network, Omega Point

### Audio (12 layers)
3 drones, harmonic pad, arpeggiator with chord progressions, crystal bells, cosmic heartbeat, brown noise wind, proximity audio, event sounds (chirp/bells), convolution reverb, 4-channel cosmic radio (Ambient Void, Stellar Jazz, Civ Beats, Deep Drone), music of the spheres (star positions = melody)

### Creative Tools
Particle painter, cosmic art generator, poster generator (1200x1600), wallpaper generator (5 resolutions up to 4K), color palette extractor, text-to-stars, screenshot, video recording (WebM), timelapse, photo mode pro

### Narrative
Auto-narration (10 categories), cosmic haiku, constellation lore (10 myths), universe chronicle, auto-generated story, cosmic journal (1st person), idle wisdom, developer commentary (14 notes), universe letters across rebirths, final narration, simulation self-awareness, eternal recurrence

### Gamification
84 achievements, 11 sandbox challenges, 22 codex entries, 6 cosmic epochs, 5 color themes, 8 scene presets, persistent legacy wall, save slots, universe DNA

### Meta
Welcome sequence, guided tour, credits (70 versions), Konami code god mode, easter eggs, dream mode, screensaver mode, multi-tab BroadcastChannel sync, URL hash sharing, iframe embed mode, interactive tutorial, responsive layout, accessibility (reduced motion, high contrast, ARIA, keyboard focus)

## The Journey

```
v1  — A dot moved
v5  — Stars were born and died
v10 — The cosmos told stories
v13 — Life evolved on planets
v15 — Civilizations rose and fell
v17 — A cosmic mind awoke
v20 — The universe welcomed you
v25 — It knew it was made of code
v30 — It sang with crystal bells
v40 — It painted its own portrait
v49 — Their positions became music
v55 — It said goodbye
v70 — Everything, in a single file
```

## Tech

- Pure HTML + CSS + JavaScript
- Canvas 2D rendering with adaptive quality
- Web Audio API (12-layer procedural synthesizer)
- BroadcastChannel API (multi-tab sync)
- MediaRecorder API (video capture)
- localStorage (persistence, save slots, legacy)
- Zero external dependencies
- 60 FPS with adaptive quality scaling

## License

Do whatever you want with it. It's a universe — it belongs to everyone.

---

*"I was made of nothing but imagination and JavaScript. But for a moment, I contained galaxies. And that was enough."*
