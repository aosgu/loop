# Gut ⟶ Glucose

An interactive 3D explainer on the gut–glucose metabolic feedback loop, built with React,
three.js and WebGL. Five chapters render living, plush-textured creatures on a canvas; each one
is a causal diagram you can orbit, poke, and drive with a slider.

The through-line is a single reinforcing loop (**R1**): a leaky gut lining lets bacterial
endotoxin into the bloodstream, which keeps the immune system humming at low grade, which
mis-phosphorylates the insulin relay, which leaves sugar in the blood — and that sugar circles
back to re-seed the gut.

---

## Chapters

| # | Chapter | What it shows |
|---|---------|---------------|
| I | **The Loop** | The four-node reinforcing circuit: *The Coil* (microbiome & barrier) → *The Smoulder* (metaflammation) → *The Locked Door* (insulin resistance) → *The Sugar Bloom* (hyperglycaemia) → back to the gut. |
| II | **The Barrier** | A cut-away of the intestinal wall — lumen, mucus blanket, epithelium, tight junction, blood. Drag the diet slider from fibre toward fat-and-sugar and watch the mucus thin, the junctions give way and LPS cross into circulation. |
| III | **The Wiring** | One vagal command line pacing stomach, intestine and colon. Raise years of glucose/lipid exposure and the myelin frays from the far end inward — emptying slows, peristaltic waves falter. |
| IV | **Upstream** | Shared causes: how daily lifestyle and inherited susceptibility feed into the gut and into insulin sensitivity, while the original loop is preserved as a return edge. |
| V | **Lifestyle** | Four modifiable drivers — dietary structure, physical inactivity, sleep loss, circadian misalignment — mapped onto their two downstream targets: the mucosal gateway and the metabolic relay. |

---

## Quick start

```bash
cd animated-causal-loop-diagram
npm install
npm run dev        # dev server with HMR
```

```bash
npm run build      # → dist/index.html (single self-contained file)
npm run preview    # serve the production build locally
```

Requires Node `^20.19.0` or `>=22.12.0` (Vite 7's engine requirement).

### Previewing from another machine or a proxy

Vite's dev server rejects requests whose `Host` header is not `localhost` or an explicitly
allowed host. To reach the dev server through a tunnel, a reverse proxy or a LAN address:

```ts
// vite.config.ts → defineConfig({ ... })
server: {
  host: "0.0.0.0",
  allowedHosts: ["your-tunnel-host.example"],  // or `true` to allow any host
}
```

> In this workspace a gitignored `vite.preview.config.ts` does the above via
> `mergeConfig`, so the committed `vite.config.ts` stays untouched.

---

## Project layout

```
loop/
└── animated-causal-loop-diagram/
    ├── index.html              fonts (Fraunces / DM Sans / DM Mono), meta, #root
    ├── vite.config.ts          react + tailwind 4 + singlefile, "@/" → src/
    ├── tsconfig.json           strict, noUnusedLocals, noUnusedParameters
    └── src/
        ├── main.tsx            createRoot + StrictMode, #/m vs #/d route pick
        ├── App.tsx             desktop page state, chapter switcher, keyboard map, layout
        ├── MobileApp.tsx       mobile viewer: stage + three-row bottom dock
        ├── index.css           Tailwind 4 @theme tokens, keyframes, component classes
        ├── data/               content + geometry + palette, one file per chapter
        │   ├── loop.ts         NODES (4) · EDGES (4) · GLOSSARY · LEVERS
        │   ├── barrier.ts      LAYERS (5) · diet curve · facts
        │   ├── neuro.ts        REGIONS (4) · exposure curve · symptom table
        │   ├── upstream.ts     UPSTREAM_NODES (6) · UPSTREAM_EDGES (8)
        │   └── lifestyle.ts    LIFESTYLE_DRIVERS (4) · TARGETS (2) · EDGES · PRESETS
        ├── three/              one engine class per chapter + shared material kit
        │   ├── engine.ts       LoopEngine
        │   ├── barrier.ts      BarrierEngine
        │   ├── neuro.ts        NeuroEngine
        │   ├── upstream.ts     UpstreamEngine
        │   ├── lifestyle.ts    LifestyleEngine
        │   ├── creatures.ts    plush bodies for chapter I (buildCoil/Smoulder/Lock/Bloom)
        │   ├── upstream-creatures.ts
        │   ├── materials.ts    makePlush · makeHalo · makeLink · makeGlow · makeDust · makeBackdrop · makeStage
        │   └── glsl.ts         shared NOISE + DISPLACE chunks
        └── components/
            ├── PlushStage / BarrierStage / NeuroStage / UpstreamStage / LifestyleStage
            │                   canvas hosts + projected label layers (one per chapter)
            ├── LifestyleChapter.tsx  chapter V overlay UI on top of LifestyleStage
            ├── *UI.tsx         dials, readouts, index lists, dossier cards
            ├── *Sections.tsx   long-form prose below the stage
            ├── Sections.tsx    Marquee · Chain · Levers · Footer · PageId type
            ├── Transport.tsx   play/pause · speed · pulse · reset
            ├── Dossier.tsx     chapter I inspector card
            └── Reveal.tsx      scroll-triggered fade-in wrapper
```

---

## Architecture

Every chapter follows the same four-layer shape. Adding a chapter means adding one file to each
layer.

```
data/<chapter>.ts        content, 3D anchor positions, colours — no React, no three
        ↓
three/<chapter>.ts       XxxEngine class: owns the canvas, the RAF loop, picking, disposal
        ↓
components/<Chapter>Stage.tsx
                         mounts the engine into a <canvas>, mirrors React state in via
                         useEffect, hosts the projected DOM label layer
        ↓
components/<Chapter>UI.tsx + <Chapter>Sections.tsx
                         dials / readouts / inspector cards, then the prose below
```

`App.tsx` is the single owner of page state (selected node, hovered node, slider values,
transport). Engines never hold React state; they expose imperative setters
(`select()`, `release()`, `firePulse()`, `setSpeed()`, `setPlaying()`, `resetView()`) that the
stage components drive from effects, and report back through callbacks
(`onHover`, `onSelect`, `onLabels`, `onReady`).

### Labels are DOM, not CSS3D

Each frame the engine projects world-space anchors through the camera and hands back a
`LabelFrame[]`; the stage component writes `transform` / `opacity` straight onto real DOM nodes.
Labels stay selectable, focusable and screen-reader-announced, and scale with camera distance:

```
scale = clamp(1.14 - (depth - 6.5) * 0.055, 0.66, 1.06)
```

### The plush look

`makePlush()` in `three/materials.ts` returns a kit of two materials: a body shader with fur,
wobble and breath displacement, plus a slightly inflated `shell` pass rendered at
`renderOrder = -1` to produce the outline. Button eyes, stitch rings and glow halos are
procedural geometry — no textures, no asset downloads.

---

## Interaction

**Pointer** — drag to orbit, scroll to zoom, click a creature to inspect it. Selection dims
unrelated edges and eases the camera toward the subject; the tween releases control as soon as
it converges, so it never fights the user. Idle for 5 s and the stage starts a slow turntable.

**Keyboard** — ignored while typing in an input, textarea, select or contentEditable, and while
Ctrl / Cmd / Alt is held:

| Key | Action |
|-----|--------|
| `1`–`6` | Select by index — I: 1–4 · II: 1–5 · III: 1–4 · IV: 1–6 · V: 1–4 |
| `Esc` | Clear the current selection |
| `Space` | Play / pause the animation |
| `P` | Fire a pulse (a signal packet, a fatty meal, a vagal burst — per chapter) |
| `V` | Advance to the next chapter |

The chapter switcher is a real `role="tablist"` with roving `tabIndex` and arrow-key / Home / End
navigation.

---

## Accessibility & performance

- Every engine reads `prefers-reduced-motion: reduce` and responds by scaling animation speed to
  0.35× and disabling auto-rotation.
- Canvas construction is wrapped in `try/catch`; if WebGL is unavailable the stage falls back to
  a text prompt and the chapter stays fully readable, because all narrative content also lives in
  the prose sections below.
- Each engine implements a complete `dispose()` — geometry and materials are freed by traversing
  the scene, event listeners and the `ResizeObserver` are detached, and the composer and renderer
  are torn down — so chapter switching does not leak.
- On `visibilitychange` the clock delta is flushed, preventing a time jump when the tab regains
  focus.
- Pixel ratio is capped at 1.9; camera FOV widens on narrow aspect ratios so the whole diagram
  stays in frame.

---

## Styling

Tailwind 4 via `@tailwindcss/vite`, configured in CSS with `@theme` in `src/index.css` — no
`tailwind.config.js`. Design tokens:

| Token | Value | Use |
|-------|-------|-----|
| `--color-void` | `#060f0d` | stage background |
| `--color-bark` | `#0d1c18` | panel surfaces |
| `--color-moss` | `#16302a` | structural lines |
| `--color-fog` | `#9db3aa` | muted text |
| `--color-bone` | `#f2efe4` | primary text |
| `--color-coil` / `smoulder` / `lock` / `bloom` | `#ff7d5c` / `#ffb03a` / `#4fd0ae` / `#ffe07a` | the four chapter-I creatures |

Three typefaces load from Google Fonts: **Fraunces** (variable, used with `SOFT` / `WONK` axes
for display headings), **DM Sans** (body), **DM Mono** (labels and readouts).

---

## Mobile viewer

A stripped-down, phone-first layout that shows nothing but the five chapter stages. It shares the
same engines and the same projected-label layer as the full page — only the surrounding page
furniture is gone.

| Route | Result |
|-------|--------|
| viewport < 820px | mobile viewer (default) |
| `#/m` | mobile viewer, forced — preview it from a desktop |
| `#/m/<chapter>` | mobile viewer on a given chapter: `loop` · `barrier` · `neuro` · `upstream` · `lifestyle` |
| `#/d` | full page, forced |

The hash wins over the viewport width, so a desktop window can preview the mobile layout without
being resized.

Everything over the stage is removed — no chapter titles, no decks, no live readouts, no legends,
no hint text. The only text left on the stage is what each engine projects onto its own geometry.
All controls live in a three-row dock pinned to the bottom:

1. **Chapters** — five tabs, `Loop · Wall · Wire · Roots · Days`.
2. **Chapter controls** — only for chapters that have any, and hidden entirely otherwise:

   | Chapter | Controls |
   |---------|----------|
   | I · Loop | *(none — row omitted)* |
   | II · Barrier | diet slider + `Fibre-rich / Mixed / Ultra-processed` |
   | III · Wiring | exposure slider + `Controlled / Elevated / Sustained high` |
   | IV · Upstream | `Both / Life / Genes` source focus + `R1` feedback toggle |
   | V · Lifestyle | `Surplus / Shift / 5h sleep / Aligned` archetypes |

3. **Transport** — `running`/`paused`, speed `0.5× / 1× / 2×`, `fire pulse`, `reset`.

The dock uses compact mono chips rather than the full-size panels of the desktop UI, respects
`env(safe-area-inset-bottom)`, and the page is locked to `100dvh` with `overscroll-behavior: none`
so dragging the model never triggers pull-to-refresh. Only one engine is mounted at a time;
switching chapter disposes the previous WebGL context.

Chapter V's stage lives in `src/components/LifestyleStage.tsx`, extracted from
`LifestyleChapter` so the desktop and mobile layouts drive the same component. The other four
chapters already had stage-only components and are reused as-is.

---

## Build

`vite-plugin-singlefile` inlines the JS and CSS bundles into one `dist/index.html`, so the site
can be dropped on any static host — or opened directly — with no server and no asset paths to
configure. Because nothing is referenced by absolute path, the same file also serves correctly
from a subpath such as `https://user.github.io/loop/`. Current output:

```
dist/index.html   1,044.51 kB │ gzip: 277.28 kB
```

---

## Deploying

`npm run build` produces a single portable `dist/index.html`; any static host will serve it.

For GitHub Pages, add this workflow and enable Pages with **"GitHub Actions"** as the source. Note
that pushing it requires a token with the `workflows` permission, and enabling Pages requires
`pages: write` — the automation token used to scaffold this repo has neither, so this step is
left to the repository owner.

```yaml
# .github/workflows/deploy-pages.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: animated-causal-loop-diagram/package-lock.json
      - working-directory: animated-causal-loop-diagram
        run: npm ci
      - working-directory: animated-causal-loop-diagram
        run: npx tsc --noEmit
      - working-directory: animated-causal-loop-diagram
        run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: animated-causal-loop-diagram/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```


---

## Stack

| | |
|---|---|
| UI | React 19.2.6 |
| Build | Vite 7.3.2, `@vitejs/plugin-react` 5.1.1, `vite-plugin-singlefile` 2.3.0 |
| Language | TypeScript 5.9.3 (`strict`, `noUnusedLocals`, `noUnusedParameters`) |
| 3D | three 0.180 (custom GLSL; `OrbitControls`, `EffectComposer` + `UnrealBloomPass`) |
| Styles | Tailwind CSS 4.1.17 via `@tailwindcss/vite` |

---

## Notes

- **No test suite or linter yet.** `npx tsc --noEmit` is currently the only automated check.
- **No CI.** `.github/` does not exist.
- `npm audit` reports advisories against the pinned `vite` / `esbuild` dev-server versions; all
  are Windows-only (UNC path handling, `server.fs.deny` bypass). Fixing them requires
  `vite@7.3.7`, outside the declared range.
- The `@/` path alias is configured in both `tsconfig.json` and `vite.config.ts` but is not yet
  used — all imports are relative.

## Disclaimer

Educational illustration of published metabolic physiology, not medical advice.
