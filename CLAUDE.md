# NRK Snarvei Static Clone

## Stack & Constraints
- Pure HTML, CSS, and native browser ES modules. **Zero build tools** (no npm, Vite, or bundlers).
- Must run directly via static HTTP hosting (GitHub Pages).
- Every local ES module `import` MUST include the explicit `.js` file extension.
- Keep responses brief; do not explain basic code.

## Architecture
- `index.html` + `styles/style.css`: Layout, templates (`#story-template`, `#explanationcard-plug-template`), and `#end-card`.
- `index.js`: Entry point. Loads NRK Sans font from `https://static.nrk.no/nrk-sans/latest/nrk-sans.min.css` and renders `./mock-data.json`.
- `scripts/`: Modular JS (`renderContent.js`, `touchNavigation.js`, `progressBar.js`, `utils.js`, plus web shims for native iOS bridge calls).