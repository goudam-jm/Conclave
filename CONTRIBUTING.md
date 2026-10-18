# Contributing

To try the carousel, use the [live demo](https://goudam-jm.github.io/CSSSlider/) or [minimal example](https://goudam-jm.github.io/CSSSlider/examples/basic.html). The steps below are for changing the code.

## Local development

Open `index.html` directly for the landscape demo. To test the module example and browser suite, serve the checkout with any static server, for example:

```sh
python3 -m http.server 8000
```

Visit `/` for the demo, `/examples/basic.html` for a neutral three-card integration, or `/test/browser.html` for browser integration tests. Keep the test tab foreground during timer tests.

Run `npm run check` for syntax checks. After editing `src/conclave.js`, run `npm run build` to regenerate `src/conclave.mjs`. No dependency installation is required.

The browser suite covers variable counts, looping and boundaries, instance isolation, events, keyboard inputs, swipe click suppression, playback suspension, teardown, reinitialization, and option validation.

## Demo hosting

GitHub Pages serves the repository root from `master`. The committed `.nojekyll` file disables Jekyll processing; all assets use relative paths compatible with `/CSSSlider/`. No build service or custom deployment workflow is required. Updates to `master` automatically update the demo.

The demo consumes `src/conclave.js` and `src/conclave.css` directly. Keep site-specific artwork and typography in `main.css`.
