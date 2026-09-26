# Repository Guidelines

## Project Structure & Module Organization

This is a lightweight, bilingual single-page portfolio deployed with GitHub Pages. The Spanish page is `index.html` (served at `/`) and the English page is `en/index.html` (served at `/en/`); both have the same markup structure, classes, ids and anchors, and differ only in their text. They share every style in `assets/site.css` and all vanilla JavaScript in `assets/site.js`; each page keeps inline only the small theme script in `<head>`, its JSON-LD and its `<noscript>` styles. Any content change (text, roles, figures, certifications) must be made in both pages. Text that the script shows is read from `data-` attributes in each page's HTML, so `assets/site.js` stays language-neutral. Store site-owned images in `img/` (for example, `img/foto-perfil.jpg` and `img/favicon.png`). The 15-second showreel lives in `video/showreel.mp4`, with its poster in `img/showreel-poster.jpg`; the hero portrait links to it and, with JavaScript, plays it in the `#reel` dialog, which downloads nothing until it is opened. Both pages use the same video, in Spanish. The Pages workflow lives in `.github/workflows/static.yml`; do not change deployment configuration unless the task requires it.

Navigation anchors and their matching sections must remain aligned: `#hero`, `#skills`, `#projects`, `#experience`, `#education`, `#certifications`, `#approach`, and `#contact`. The navbar links five of them; the rest are reached by scrolling. Keep every existing anchor id even if a section is renamed, so external deep links do not break.

## Build, Test, and Development Commands

No installation, build step, package manager, linter, or automated test suite is configured.

```powershell
Start-Process .\index.html
```

Use this command to open the site locally. For changes involving responsive layout, keyboard interaction, theme selection, or scrolling, also check the page in a browser at desktop and mobile widths. GitHub Pages publishes the repository contents after a push to `main` through the static workflow.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, and JavaScript, and preserve the current page content (Spanish, and British English on the English page) and accessibility attributes. Prefer semantic HTML (`<section>`, headings, lists, `<time>`) and meaningful `aria-*` labels when adding interactive elements. Reuse the CSS custom properties and existing component classes (`.card`, `.chip`, `.pill`, `.btn`, `.icon`, `.eyebrow`, `.title`, `.lede`, `.reveal`) rather than introducing inline styles or new dependencies. Icons are inline SVG symbols defined once in the sprite at the top of `<body>`: to add one, add a `<symbol>` there instead of an icon library. Name CSS classes with lowercase kebab-case (for example, `.cert-item`) and JavaScript identifiers in camelCase (for example, `toggleTheme`).

Keep light and dark theme values synchronized between `:root` and `[data-theme="dark"]`; theme preferences are stored in `localStorage`. The closing band uses its own always-dark `--band-*` tokens and is not themed.

To add or remove a certification, edit only `#certIndex`, in both pages: give the entry a `data-track` value (`ia`, `oracle`, `gestion`, or several separated by spaces). Filter counts, per-issuer totals, and the hero figure are derived from the DOM, so no number needs updating by hand.

## Testing Guidelines

There is no automated coverage requirement. Before submitting a change, manually verify both pages: each loads without console errors, the EN / ES switch leads to the other language, all navigation links reach their sections, the mobile menu opens and closes by keyboard (Escape returns focus to the button and the focus trap holds), the showreel opens from the portrait by mouse and keyboard and closes with Escape, the close button or a click outside (focus returns to the portrait), the certification filters keep their counts consistent, and both themes remain readable. Confirm images load from `img/` and that the fallback fonts, used when Google Fonts does not load, do not break essential content. Check the layout at roughly 375px, 768px, and 1280px, and confirm the page still reads correctly with JavaScript disabled and with `prefers-reduced-motion` enabled.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects consistent with the history: `Fix mobile menu focus handling` or `Improve page metadata`. Keep each commit focused. Pull requests should describe the user-visible change, link any relevant issue, and include before/after screenshots for visual or responsive updates. Mention manual checks performed and avoid unrelated formatting or content changes.
