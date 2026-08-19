# Repository Guidelines

## Project Structure & Module Organization

This is a lightweight, single-page portfolio deployed with GitHub Pages. Keep page markup, styles, and behavior together in `index.html`: CSS belongs in its existing `<style>` block and vanilla JavaScript in the `<script>` block near the end of the page. Store site-owned images in `img/` (for example, `img/foto-perfil.jpg` and `img/favicon.png`). The Pages workflow lives in `.github/workflows/static.yml`; do not change deployment configuration unless the task requires it.

Navigation anchors and their matching sections must remain aligned: `#hero`, `#skills`, `#projects`, `#experience`, `#education`, `#certifications`, `#approach`, and `#contact`. The navbar links five of them; the rest are reached by scrolling. Keep every existing anchor id even if a section is renamed, so external deep links do not break.

## Build, Test, and Development Commands

No installation, build step, package manager, linter, or automated test suite is configured.

```powershell
Start-Process .\index.html
```

Use this command to open the site locally. For changes involving responsive layout, keyboard interaction, theme selection, or scrolling, also check the page in a browser at desktop and mobile widths. GitHub Pages publishes the repository contents after a push to `main` through the static workflow.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, and JavaScript, and preserve the current Spanish page content and accessibility attributes. Prefer semantic HTML (`<section>`, headings, lists, `<time>`) and meaningful `aria-*` labels when adding interactive elements. Reuse the CSS custom properties and existing component classes (`.card`, `.chip`, `.pill`, `.btn`, `.eyebrow`, `.title`, `.lede`, `.reveal`) rather than introducing inline styles or new dependencies. Name CSS classes with lowercase kebab-case (for example, `.cert-item`) and JavaScript identifiers in camelCase (for example, `toggleTheme`).

Keep light and dark theme values synchronized between `:root` and `[data-theme="dark"]`; theme preferences are stored in `localStorage`. The closing band uses its own always-dark `--band-*` tokens and is not themed.

To add or remove a certification, edit only `#certIndex`: give the entry a `data-track` value (`ia`, `oracle`, `gestion`, or several separated by spaces). Filter counts, per-issuer totals, and the hero figure are derived from the DOM, so no number needs updating by hand.

## Testing Guidelines

There is no automated coverage requirement. Before submitting a change, manually verify that the page loads without console errors, all navigation links reach their sections, the mobile menu opens and closes by keyboard (Escape returns focus to the button and the focus trap holds), the certification filters keep their counts consistent, and both themes remain readable. Confirm images load from `img/` and external font/icon fallbacks do not break essential content. Check the layout at roughly 375px, 768px, and 1280px, and confirm the page still reads correctly with JavaScript disabled and with `prefers-reduced-motion` enabled.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects consistent with the history: `Fix mobile menu focus handling` or `Improve page metadata`. Keep each commit focused. Pull requests should describe the user-visible change, link any relevant issue, and include before/after screenshots for visual or responsive updates. Mention manual checks performed and avoid unrelated formatting or content changes.
