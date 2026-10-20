# Conclave

A reusable perspective carousel with CSS transitions and a small, dependency-free JavaScript controller. Bring your own HTML and styling. The landscape site in `index.html` is the demo, built with the same public library.

[Live demo](https://goudam-jm.github.io/Conclave/) · [Minimal example](https://goudam-jm.github.io/Conclave/examples/basic.html)

No installation is needed to try the carousel.

## Install

```sh
npm install conclave-carousel
```

With a bundler:

```js
import Conclave from 'conclave-carousel';
import 'conclave-carousel/conclave.css';

const carousel = new Conclave('.gallery', { loop: true });
```

Initialize after your carousel markup exists. See the markup and options below.

## Quick start without a bundler

Copy `src/conclave.css` and `src/conclave.js` into your project:

```html
<link rel="stylesheet" href="conclave.css">

<section class="gallery" aria-label="Featured projects">
  <div data-conclave-track>
    <article data-conclave-slide>First project</article>
    <article data-conclave-slide>Second project</article>
    <article data-conclave-slide>Third project</article>
  </div>
  <button data-conclave-prev>Previous</button>
  <div data-conclave-pagination role="group" aria-label="Choose slide"></div>
  <button data-conclave-next>Next</button>
</section>

<script src="conclave.js"></script>
<script>
  const gallery = new Conclave('.gallery', {
    startIndex: 0,
    loop: true,
    autoplay: false,
    interval: 5000
  });
</script>
```

Initialize after the markup exists. Use an element or selector. Each instance is independent; initializing the same element twice throws. The track and at least one direct child with `data-conclave-slide` are required. All controls are optional and scoped to the instance.

Slides can contain text, images, links, and other HTML. Use an `article` or `div` when containing interactive elements; never put links or inputs inside a slide that is itself a button. Add meaningful `aria-label` values to slides when appropriate. Render slide content in HTML before initialization. To change the slide collection later, call `destroy()`, edit the markup, then initialize again.

See the [minimal working integration](https://goudam-jm.github.io/Conclave/examples/basic.html) or copy `examples/basic.html` from this repository.

## Modules and packaging

Native browser modules can import directly:

```js
import Conclave from './src/conclave.mjs';
const gallery = new Conclave(document.querySelector('.gallery'));
```

Package exports support ESM, CommonJS and the CSS entry point. Bundlers can use:

```js
import Conclave from 'conclave-carousel';
import 'conclave-carousel/conclave.css';
```

The npm package includes the browser script, ESM entry, CSS, and MIT license. `npm pack` builds the ESM entry from the canonical `src/conclave.js` and runs syntax checks. No runtime dependencies or consumer build step are required. Importing the constructor is safe in Node; constructing a carousel requires a browser DOM.

## Options

- `startIndex: 0` — zero-based initial slide. Looping wraps indices; non-looping clamps them.
- `loop: true` — wrap first/last navigation. Set false to stop and disable boundary controls.
- `autoplay: false` — opt into automatic progression.
- `interval: 5000` — positive milliseconds between automatic advances.
- `keyboard: true` — Left/Right, Home and End when focus is in the carousel. Editable fields and modified shortcuts are ignored.
- `swipe: true` — horizontal pointer gestures; vertical scrolling remains available.
- `swipeThreshold: 40` — positive minimum horizontal distance in pixels.
- `selectOnClick: true` — bring clicked slides into focus.
- `pagination: true` — generate dots inside an optional `data-conclave-pagination` container.

One slide is supported, with previous/next disabled and no autoplay. Larger collections show the current card plus up to two neighbors on each side; distant slides are hidden and inert. Even counts use a consistent left-side tie break. Nested carousel instances are not supported.

## Controls and API

Optional controls are `data-conclave-prev`, `data-conclave-next`, and `data-conclave-play`. Use buttons. A playback button receives `aria-pressed`, an accessible label, and `data-conclave-playing="true|false"` for your own icon styling; its content is preserved. Optional `data-conclave-current` and `data-conclave-total` elements display two-digit counts.

```js
gallery.next();
gallery.prev();
gallery.goTo(2);
gallery.play();
gallery.pause();
console.log(gallery.index); // current zero-based index (read-only by convention)
gallery.destroy();
```

Navigation and playback methods return the instance for chaining. `destroy()` removes generated controls, event listeners and timers, restores library-modified attributes and counter text, and permits reinitialization. It is safe to call twice. Treat options and instance state as read-only after construction.

Listen for changes on the root:

```js
document.querySelector('.gallery').addEventListener('conclave:change', event => {
  const { index, previousIndex, slide } = event.detail;
  console.log(index, previousIndex, slide);
});
```

The event fires only when the index changes, including automatic advances. Manual changes are announced through a generated live region. Automatic changes are silent. Autoplay suspends while hovering, while focus is anywhere inside, and while the tab is hidden. Reduced-motion preferences disable transitions and prevent initial autoplay; switching to reduced motion stops playback. A deliberate `play()` call can restart it.

## Styling

Library selectors are scoped to `.conclave` / `.conclave__*`. The library supplies positioning, motion, focus indicators and optional dots; it does not load fonts, reset the page, or prescribe card content.

```css
.gallery {
  --conclave-height: 320px;
  --conclave-slide-width: 60%;
  --conclave-radius: 16px;
  --conclave-duration: 500ms;
  --conclave-easing: ease;
  --conclave-accent: #6752bb;
  --conclave-dot: #d8d2f0;
}
.gallery [data-conclave-slide] {
  background: #eeeaf6;
  padding: 24px;
}
@media (max-width: 700px) {
  .gallery { --conclave-slide-width: 85%; --conclave-height: 280px; }
}
```

The library defaults to 48% card width / 410px height and switches to 78% / 375px below 700px. Load your stylesheet after the library and use an instance selector to override defaults. Select `[data-conclave-position="0"]` for the active card's custom styling. The original landscape art and editorial design remain exclusively in `main.css`.

Requires modern browsers supporting CSS custom properties, Pointer Events, `inert`, and `MediaQueryList.addEventListener`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development and verification.

## License

[MIT](LICENSE) © 2013–2026 Goudam Muralitharan. You may use this library in personal, commercial, open-source, and closed-source projects. Keep the copyright and license notice when redistributing copies or substantial portions. The software is provided without warranty.

Originally a CSS3 and jQuery experiment; the modern library retains its centered perspective arrangement without jQuery.
