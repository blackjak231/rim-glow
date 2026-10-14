# rim-glow

An animated glow along the edges of a screen or a box, with a wave of light that starts where you press. Inspired by the SwiftUI prototype [Prototype-Siri-Screen-Animation](https://github.com/metasidd/Prototype-Siri-Screen-Animation) by Siddhant Mehta.

- The whole effect fits in one stylesheet: it works **without JavaScript**.
- A `<rim-glow>` custom element (about 9 kB gzipped) adds the wave from the pressed point, the optional distortion (SVG or CSS), a background image and the choice of the original blob. It works anywhere: Vue, React, Alpine, Blade, plain HTML.

## Contents

- [Installation](#installation)
- [Recipes](#recipes)
    - [A button that turns the glow on and off](#a-button-that-turns-the-glow-on-and-off)
    - [Glow while a task runs](#glow-while-a-task-runs)
    - [A button that glows itself](#a-button-that-glows-itself)
    - [The whole screen](#the-whole-screen)
    - [Vue](#vue)
    - [React](#react)
    - [Alpine / Blade](#alpine--blade)
- [Attributes and API](#attributes-and-api)
- [CSS-only usage](#css-only-usage)
- [Customization (CSS variables)](#customization-css-variables)
- [Themes](#themes)
- [Distortion](#distortion)
- [What follows the original prototype](#what-follows-the-original-prototype)
- [Known differences](#known-differences)
- [Browsers](#browsers)
- [Demo](#demo)
- [Development](#development)
- [Releases](#releases)
- [Credits](#credits)
- [License](#license)

## Installation

```bash
pnpm add rim-glow   # or a local link: pnpm add ../rim-glow
```

## Recipes

Load the element once, anywhere in your app:

```js
import "rim-glow"; // defines <rim-glow>
```

Without a bundler (Blade, plain HTML): `<script src="/vendor/rim-glow/rim-glow.iife.js" defer></script>`.

The glow is drawn over the edges of whatever you put inside `<rim-glow>`. Give the element the same corners as its content (`border-radius` and `overflow: hidden`): the glow follows them. Turning the glow on or off is just the `active` property (or attribute).

### A button that turns the glow on and off

```html
<rim-glow id="card" style="border-radius: 24px; overflow: hidden">
    <div class="card">…</div>
</rim-glow>

<button id="toggle">Toggle glow</button>

<script type="module">
    import "rim-glow";

    const card = document.querySelector("#card");

    document.querySelector("#toggle").addEventListener("click", () => {
        card.active = !card.active;
    });
</script>
```

The wave of light starts from where you clicked, here the button, even when it sits outside the card.

### Glow while a task runs

```js
async function improveText() {
    card.active = true;

    try {
        await fetch("/api/improve", { method: "POST" });
    } finally {
        card.active = false; // also on error
    }
}
```

When the glow turns off later than a click (an API response), its wave starts from the center.

### A button that glows itself

```html
<rim-glow id="ask" style="display: inline-block; border-radius: 999px; overflow: hidden; --rim-glow-blur: 8px; --rim-glow-wobble: 3px">
    <button class="pill">Ask AI</button>
</rim-glow>

<script type="module">
    import "rim-glow";

    const ask = document.querySelector("#ask");
    ask.addEventListener("click", () => (ask.active = !ask.active));
</script>
```

The defaults are tuned for a screen-sized box. On a small element (a button, a field), lower the blur and the wobble as above, or the glow covers the whole element.

### The whole screen

```html
<rim-glow id="screen-glow" fixed></rim-glow>
<button id="listen">Listen</button>

<script type="module">
    import "rim-glow";

    const screenGlow = document.querySelector("#screen-glow");
    document.querySelector("#listen").addEventListener("click", () => {
        screenGlow.active = !screenGlow.active;
    });
</script>
```

`fixed` covers the viewport and never blocks clicks on the page below.

### Vue

```js
// vite.config.js: let Vue know <rim-glow> is a custom element
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === "rim-glow" } } });
```

```vue
<script setup>
import "rim-glow";
import { ref } from "vue";

const glowing = ref(false);
</script>

<template>
    <rim-glow :active="glowing" class="card">…</rim-glow>
    <button @click="glowing = !glowing">Toggle glow</button>
</template>
```

### React

```jsx
import "rim-glow";
import { useState } from "react";

export function Card() {
    const [glowing, setGlowing] = useState(false);

    return (
        <>
            <rim-glow active={glowing || undefined} className="card">…</rim-glow>
            <button onClick={() => setGlowing(!glowing)}>Toggle glow</button>
        </>
    );
}
```

React 18 turns `false` into the string `"false"`, which rim-glow also reads as off; `undefined` removes the attribute. React 19 handles custom elements directly.

### Alpine / Blade

```html
<div x-data="{ glowing: false }">
    <rim-glow :active="glowing" class="card">…</rim-glow>
    <button @click="glowing = !glowing">Toggle glow</button>
</div>
```

Alpine removes the attribute when the value is `false`. In Blade without Alpine: `<rim-glow @if($active) active @endif>`.

## Attributes and API

| Attribute       | Values                                          | Default   |
|-----------------|-------------------------------------------------|-----------|
| `active`        | present or absent (`active="false"` = absent)   | absent    |
| `fixed`         | covers the viewport without blocking clicks     | absent    |
| `ripple`        | `toggle`, `activate`, `press`, `none`           | `toggle`  |
| `ripple-origin` | `pointer`, or a CSS position: `50% 100%`, `120px 40px`, `bottom right` | `pointer` |
| `distort`       | `svg`, `css` or `none`: how the wave moves the content (see [Distortion](#distortion)) | `svg` |
| `image`         | background image URL, drawn under the content (cover) | absent |
| `blob`          | `original`: the regular blob of the source. By default, the blob keeps changing shape over time, every point drifting on its own (position along its edge, wobble phase), with the same amplitude and pace | organic |
| `flow`          | `clockwise` or `counterclockwise`: the colors travel around the edges (not in the original, where each color stays in its area) | absent |
| `theme`         | `aurora`, `sunset`, `ocean`, `neon`, `ember`, `pastel`, `mono` | original colors |
| `gradient-speed` | pace of the color gradient (`1` = the original, `2` = twice as fast, `0` = frozen), changes live without a jump | `0.8` |
| `blob-speed`    | pace of the blob edge (wobble and organic drift), same scale | `0.7` |

- `ripple="toggle"`: a wave on every activation and deactivation. When the change follows a click (within 100 ms), the wave starts from the pressed point and is advanced by the time since the press, as in the original, where the wave starts on press and the state changes on release. Otherwise (keyboard, or a response that arrives later), it starts from the center, or from `ripple-origin`.
- `ripple="press"`: a wave on every press inside the element, like the prototype.
- `el.ripple(event)` plays a wave by hand (any `{ clientX, clientY }` object works).
- `el.active = true` works as a property too.
- Several elements on one page never move in sync: each starts its clocks from its own random point, so their gradients and blobs differ at any moment (same pace). In CSS-only usage, all instances share the same clocks.

## CSS-only usage

```js
import "rim-glow/rim-glow.css";
```

```html
<div class="rim-glow" data-active>
    <div class="rim-glow__stage">
        <div class="rim-glow__content"><!-- your content --></div>
        <div class="rim-glow__layers" aria-hidden="true">
            <div class="rim-glow__scrim"></div>
            <div class="rim-glow__glow"><div class="rim-glow__frame"><div class="rim-glow__mesh">
                <div class="rim-glow__rows"><i></i><i></i><i></i></div>
                <div class="rim-glow__cols"><i></i><i></i><i></i></div>
            </div><div class="rim-glow__flow"></div></div></div>
            <div class="rim-glow__rim"></div>
        </div>
    </div>
    <div class="rim-glow__ripple" aria-hidden="true"></div>
</div>
```

The state comes from the `data-active` attribute (rendered by the server, or toggled by Alpine, Livewire…). `data-fixed` covers the viewport. `data-distort="css"` adds the CSS distortion (the SVG one needs the element). `data-blob="original"` turns the organic blob off. `data-flow="clockwise"` makes the colors travel around the edges. Without a script, the wave plays on every activation, from `--rim-glow-ripple-x` / `--rim-glow-ripple-y` (center by default). `data-ripple="off"` turns it off. `rimGlowMarkup(content)` returns this markup as a string.

## Customization (CSS variables)

| Variable | Default | Role |
|---|---|---|
| `--rim-glow-gradient-speed` | `0.8` | Pace of the gradient (`1` = the original), for CSS-only usage (with the element, prefer `gradient-speed`, which does not jump when changed) |
| `--rim-glow-blob-speed` | `0.7` | Pace of the blob, same (with the element, prefer `blob-speed`) |
| `--rim-glow-wobble` | `8px` | Blob amplitude (`10px` = the original) |
| `--rim-glow-flow-duration` | `12s` | With `flow`: time of a full turn |
| `--rim-glow-flow-mix` | `1` | With `flow`: how much the turning colors cover the original mesh (`1` = fully) |
| `--rim-glow-organic` | `1` | How far the points of the organic blob drift (`0` = the original blob, `2` = twice as far) |
| `--rim-glow-blur` | `28px` | Glow thickness (blur of the edge) |
| `--rim-glow-ripple-speed` | `1` | Wave speed (1 = 2000 px/s) |
| `--rim-glow-press-size` | `100px` | Radius of the pressed area: the wave leaves from its edge, and the distortion swells there like a finger press instead of pinching a point (`0` = the original point) |
| `--rim-glow-distort` | `0.7` | Distortion strength. `1` = the original (12 px for `svg`, 1 % scale for `css`) |
| `--rim-glow-ripple-intensity` | `1` | Light intensity of the wave, from 0 to 1 |
| `--rim-glow-radius` | the element's corners | Fixed corner radius of the white rim. Without it, the rim follows the element's `border-radius` (as the original follows the screen corners) |
| `--rim-glow-rim-opacity` | `0.6` | Rim opacity |
| `--rim-glow-rim-color` | `#fff` | Rim color |
| `--rim-glow-scrim` | `0` | Scrim over the content while active (`0.8` in the prototype) |
| `--rim-glow-scrim-color` | `#000` | Scrim color |
| `--rim-glow-backdrop` | `#000` | Backdrop under the gradient, visible while it fades in |
| `--rim-glow-duration` | `0.9s` | Fade-in duration |
| `--rim-glow-easing` | `cubic-bezier(0.42, 0, 0.58, 1)` | Fade-in easing (SwiftUI easeInOut) |
| `--rim-glow-yellow`, `-purple`, `-indigo`, `-orange`, `-red`, `-blue`, `-indigo-2`, `-green`, `-mint` | theme colors (without a theme: iOS system colors, dark mode) | The 9 gradient points, one by one. A variable replaces its color whatever the theme. |
| `--rim-glow-z-index` | `2147483000` | With `fixed` |

## Themes

Without a `theme` attribute, the gradient keeps the original colors. A theme changes all 9 colors at once: `aurora`, `sunset`, `ocean`, `neon`, `ember`, `pastel` and `mono` (white). In CSS-only usage, set the `data-theme` attribute on `.rim-glow`.

To adjust a single color, keep the theme and add the variable:

```html
<rim-glow theme="sunset" style="--rim-glow-green: #00ff9c"></rim-glow>
```

Each color sits on one point of the mesh: `yellow` (top left corner), `purple` (top), `indigo` (top right corner), `orange` (left), `red` (center), `blue` (right), `indigo-2` (bottom left corner), `green` (bottom), `mint` (bottom right corner). The theme list is exported in JS as `RIM_GLOW_THEMES`.

## Distortion

The original shader also moves every pixel by `12 × sin(15τ) × e^(-8τ)` px along the line from the press, as the wave passes. A browser cannot run a shader on HTML, so `distort` offers two trade-offs:

| Style | Applies to | Look |
|---|---|---|
| `svg` | any content inside the element | Follows the wave front like the original, through an SVG displacement filter. Browsers move pixels by whole device pixels there, so the motion advances in visible steps. |
| `css` | any content inside the element | The content scales toward the press point with the same time curve (deepest at 72 ms, small rebound, still after 0.6 s). Smooth, but everything moves at once instead of following the front. |

`svg` is the default; `distort="none"` turns the distortion off (the wave is then only light). `--rim-glow-distort` scales the strength of both. The distortion is skipped in `fixed` mode and with `prefers-reduced-motion`.

What to know before keeping `svg`:

- Browser support: SVG filters on HTML elements work in Chrome, Edge, Safari and Firefox. Smooth in Chromium; noticeably less smooth in Firefox.
- During the wave (under a second), the content gets a CSS `filter`: `position: fixed` elements inside it are placed relative to the element instead of the viewport, and anything overflowing it by more than 10 % is clipped.
- Cost: the filter is recomputed every frame while the wave runs. Smooth on desktop Chrome; heavier on phones and in Safari, where SVG filters run on the CPU.
- In CSS-only usage there is no SVG distortion (it needs the element); `data-distort="css"` is available there.

## What follows the original prototype

- **Blob edge**: the `AnimatedRectangle` polygon (inset 8, corners cut at 48, the same 15 points), each point moved by `10 × sin(t + 0.1 × coordinate)`, shrinking from ×1.2 to ×1 while its blur goes from 8 to 28 px.
- **Speeds**: at speed 1, time advances 3 units/s at all times and 3 more while active (the two timers of the original), so the edge wobbles once every 1.05 s. The gradient and the blob each get that pair of clocks, so their paces can be set apart. Transitions take 0.9 s with easeInOut.
- **Mesh gradient**: the same ranges, speeds, offsets and colors for the 6 moving points, scaled ×1.3.
- **Rim**: a 4 px white stroke with a blur of 4.
- **Wave**: `0.3 × sin(15τ) × e^(-8τ)` added to the color, at 2000 px/s. It leaves from the edge of a 100 px pressed area instead of a point (`--rim-glow-press-size: 0` restores the point).

Measured against the author's video: the wave speed, the brightness peak (+15 %) and the glow profile along the left edge all match.

## Known differences

- **Softer distortion by default**: the lens moves pixels by 0.7 of the original amplitude (`--rim-glow-distort: 1` restores it), from a 100 px pressed area.
- **Calmer and organic by default**: the gradient runs at 0.8 of the original pace and the blob at 0.7, the blob moves by 8 px instead of 10, and its points drift on their own so the shape keeps changing. `gradient-speed="1"`, `blob-speed="1"`, `--rim-glow-wobble: 10px` and `blob="original"` restore the original.

- **Mesh gradient**: CSS has no `MeshGradient`. The mesh is rebuilt by averaging a row-wise and a column-wise blend: the same colors in the same places, with slightly different transitions. Under the 28 px blur, the difference is small.
- **Rim**: in the original, it sits under the masked content. Here, it is drawn on top at 0.6 opacity, the average of what the mask lets through.
- **Wave in `fixed` mode**: the wave lightens the page by compositing rather than pure addition (a `fixed` element isolates its rendering). The difference only shows on light backgrounds.
- **Distortion**: see [Distortion](#distortion): neither style matches the original shader exactly.
- **Without the element (CSS only)**, the gradient and the wobble restart from the same point on every activation. The element keeps them going, as in the original.
- With `prefers-reduced-motion`, the edge stops moving and the wave is turned off.

## Browsers

Chrome 117+, Safari 17.5+, Firefox 129+ (`@property`, `sin()`, `@starting-style`, `display` transitions).

Tested in Chromium and WebKit (Safari's engine): glow, wave, both distortion styles, CSS-only mode. Checked by hand in Firefox: everything works, the SVG distortion is less smooth there.

## Demo

Open `demo/index.html` with a double click (no server needed, the demo loads `dist/`). Four example cards (a photo to retouch, a text to improve, an assistant field, the original voice prompt) each turn their own glow on: they share the style but never move in sync. A floating settings panel covers every parameter for all of them. Values are kept between visits, and the matching code is shown, ready to copy.

Demo photo by Kevin Young on [Unsplash](https://unsplash.com/photos/-icmOdYWXuQ), under the Unsplash License (free to use).

## Development

```bash
pnpm install
pnpm build   # dist/: rim-glow.js (ESM), rim-glow.iife.js (script tag), rim-glow.css, types
```

`pnpm dev` rebuilds `dist/` on every change in `src/`: just reload the demo.

## Releases

Releases are automatic. Every push to `main` runs [semantic-release](https://github.com/semantic-release/semantic-release), which reads the [conventional commits](https://www.conventionalcommits.org/) since the last release: `fix:` publishes a patch, `feat:` a minor version, a `BREAKING CHANGE:` footer a major one. It publishes to npm (with provenance, through npm trusted publishing, no token stored) and writes the GitHub release notes. Other commit types (`docs:`, `chore:`, `refactor:`…) publish nothing.

## Credits

Inspired by the SwiftUI prototype [Prototype-Siri-Screen-Animation](https://github.com/metasidd/Prototype-Siri-Screen-Animation) by Siddhant Mehta.

## License

[MIT with the Commons Clause](LICENSE) © blackjak231.

- You may use, copy, modify and ship rim-glow in any project, including commercial websites and apps.
- You may not sell rim-glow itself, or a product or service whose value derives entirely or substantially from it (a paid component, a template pack built around it, paid hosting or support of it).

The Commons Clause makes this a source-available license rather than an OSI-approved open-source one.
