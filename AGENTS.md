# Repository Guidelines

## Project Structure & Module Organization

This is a lightweight, single-page portfolio deployed with GitHub Pages. Keep page markup, styles, and behavior together in `index.html`: CSS belongs in its existing `<style>` block and vanilla JavaScript in the `<script>` block near the end of the page. Store site-owned images in `img/` (for example, `img/foto-perfil.jpg` and `img/favicon.png`). The Pages workflow lives in `.github/workflows/static.yml`; do not change deployment configuration unless the task requires it.

Navigation anchors and their matching sections must remain aligned: `#hero`, `#experience`, `#certifications`, `#projects`, `#skills`, `#education`, and `#contact`.

## Build, Test, and Development Commands

No installation, build step, package manager, linter, or automated test suite is configured.

```powershell
Start-Process .\index.html
```

Use this command to open the site locally. For changes involving responsive layout, keyboard interaction, theme selection, or scrolling, also check the page in a browser at desktop and mobile widths. GitHub Pages publishes the repository contents after a push to `main` through the static workflow.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, and JavaScript, and preserve the current Spanish page content and accessibility attributes. Prefer semantic HTML (`<section>`, headings, lists, `<time>`) and meaningful `aria-*` labels when adding interactive elements. Reuse CSS custom properties and existing component classes rather than introducing inline styles or new dependencies. Name CSS classes with lowercase kebab-case (for example, `.skill-fill`) and JavaScript identifiers in camelCase (for example, `toggleTheme`).

Keep light and dark theme values synchronized between `:root` and `[data-theme="dark"]`; theme preferences are stored in `localStorage`.

## Testing Guidelines

There is no automated coverage requirement. Before submitting a change, manually verify that the page loads without console errors, all navigation links reach their sections, the mobile menu works by keyboard, and both themes remain readable. Confirm images load from `img/` and external font/icon fallbacks do not break essential content.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects consistent with the history: `Fix mobile menu focus handling` or `Improve page metadata`. Keep each commit focused. Pull requests should describe the user-visible change, link any relevant issue, and include before/after screenshots for visual or responsive updates. Mention manual checks performed and avoid unrelated formatting or content changes.
