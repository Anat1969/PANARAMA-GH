# Panarama — Neumorphic Image-Transition Gallery

A single-page gallery that demonstrates **three image-to-image transition
states** — **Fade**, **Slide**, and **Zoom** — styled in the soft *neumorphic*
aesthetic from the "Elements" design board.

![Fade · Slide · Zoom](https://img.shields.io/badge/transitions-Fade%20%C2%B7%20Slide%20%C2%B7%20Zoom-6E7F8D)

## Features

A deliberately **minimalist, single-column layout** echoing the sparse "Elements"
inspiration board: a numbered `3 | Panarama` header, thin wide-tracked uppercase
labels, lots of whitespace, and almost no UI chrome.

- **3 transition states**, selected with three plain text labels (the only control):
  - **Fade** — crossfade dissolve
  - **Slide** — horizontal slide
  - **Zoom** — scale-and-fade
- **The picker is the interaction.** Clicking Fade / Slide / Zoom selects that
  effect *and* plays it by advancing to the next image. Clicking the image itself
  also advances — so the gallery is navigable with zero visible buttons.
- **Preset demo gallery** — works out of the box; each image has an on-brand
  gradient fallback that renders even without network access.
- **Generate Space** — a button that creates an AI image of a *minimalist living
  space* inspired by the board, appends it to the gallery, and transitions to it.
  Runs fully client-side with **no API key** via [Pollinations](https://pollinations.ai)
  (a fresh seed per click → a new image each time); a gradient placeholder shows
  while it loads.
- A thin caption label (`01  Still Water`) under the image, board-style.
- Fully responsive; respects `prefers-reduced-motion`.

## Design system

Extracted directly from the attached style board and encoded as CSS custom
properties in [`src/styles/theme.css`](src/styles/theme.css):

| Token | Value |
| --- | --- |
| Background | `#EFF2F9` |
| Surface | `#E4EBF1` |
| Muted | `#B5BFC6` |
| Accent | `#6E7F8D` |
| Shadow (light) | `#FAFBFF` @ 100% |
| Shadow (dark) | `#161B1D` @ 23% |

Neumorphic shadow tiers mirror the board's X&Y / Blur values (5/10, 10/20,
20/40), with inset variants used for pressed/selected states.

### Fonts

The original board specifies **Campton** and **Avenir Next**, which are
commercial licensed fonts. They are substituted with close web equivalents
loaded from Google Fonts:

- Campton → **Jost** (geometric sans)
- Avenir Next → **Nunito Sans**

Swap the `@import`/`<link>` in `index.html` and the `--font-*` tokens in
`theme.css` if you have licenses for the originals.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Project structure

```
src/
  components/
    ImageStage.tsx      # two stacked layers; applies the active transition
    TransitionPicker.tsx# 3 plain text labels (Fade / Slide / Zoom)
    GenerateButton.tsx  # "Generate Space" — keyless AI image (Pollinations)
  data/images.ts        # preset gallery + gradient fallbacks + generator helper
  hooks/useGallery.ts   # index / transition / direction state
  styles/
    theme.css           # design tokens + neumorphic surfaces
    transitions.css     # fade / slide / zoom keyframes
  App.tsx               # minimalist single-column layout
```

## How the transitions work

`ImageStage` keeps the current image and (while animating) the previous image as
two absolutely-positioned layers. On change it sets `data-transition` and
`data-direction` on the stage; `transitions.css` maps those to the right
keyframes. Duration is a single token (`--transition-dur`, ~600ms).
