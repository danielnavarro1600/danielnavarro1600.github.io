# Daniel Navarro Delgado | Professional Website

Personal portfolio website presenting my experience at the intersection of finance, enterprise technology and applied artificial intelligence.

## Live website

- [Spanish version](https://danielnavarro1600.github.io)
- [English version](https://danielnavarro1600.github.io/en/)

## Overview

This is a lightweight, bilingual single-page website built without a framework or build process. The Spanish page (`index.html`) and the English page (`en/index.html`) share the same structure and differ only in their text; all styling lives in `assets/site.css` and all interactivity in `assets/site.js`, so a design change is made once and reaches both languages. Any content change has to be made in both pages. The site can be opened locally and deployed directly to GitHub Pages.

The website is organised as a single narrative: what I can solve, what I have built, where I have worked, what I studied, what I keep learning, how I work, and how to reach me.

Sections and anchors:

| Anchor | Section |
| --- | --- |
| `#hero` | Value proposition, portrait and headline figures |
| `#skills` | Capabilities, the data-to-decision flow and the technical stack |
| `#projects` | Two case studies plus shorter internal, outreach and personal work |
| `#experience` | Career timeline |
| `#education` | Degrees and languages |
| `#certifications` | Filterable certification index (34 entries, three tracks) |
| `#approach` | How I work |
| `#contact` | Email and professional links |

Features:

- Spanish and English versions, linked by an EN / ES switch and `hreflang` alternates
- Light and dark themes with no flash on reload, following the system preference until the visitor chooses
- Filterable certification index whose counts are derived from the DOM
- Full keyboard navigation, visible focus states and AA contrast in both themes
- Scroll-based reveals that respect `prefers-reduced-motion`
- Readable print stylesheet
- Metadata and structured data for search engines and social previews

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Inline SVG icons (no icon library)
- Google Fonts
- GitHub Pages

## Project structure

```text
danielnavarro1600.github.io/
├── .github/workflows/static.yml
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── assets/
│   ├── site.css          (all styles, shared by both pages)
│   └── site.js           (all interactivity, shared by both pages)
├── cv/
│   ├── cv-daniel-navarro-delgado.pdf
│   └── cv-daniel-navarro-delgado-en.pdf
├── en/
│   └── index.html        (English page)
├── img/
│   ├── favicon.png
│   ├── foto-perfil.jpg
│   ├── og-image.jpg      (social preview, Spanish)
│   └── og-image-en.jpg   (social preview, English)
└── index.html            (Spanish page)
```

## Run locally

No installation or package manager is required.

1. Download or clone the repository.
2. Open `index.html` (Spanish) or `en/index.html` (English) in a web browser.

On Windows PowerShell, from the project folder:

```powershell
Start-Process .\index.html
```

## Development approach

The project intentionally uses a simple setup:

- No `package.json`
- No external JavaScript framework
- No compilation or build step
- No environment variables

Before making substantial changes, create a Git branch or a backup copy of the files you will touch. Review and test each change locally, in both languages, before publishing it.

## External resources

The pages load their fonts from Google Fonts. Icons are inline SVG defined in a sprite at the top of each page's `<body>`, and all images (profile photo, favicon and social preview) are hosted locally in `img/`. Without an internet connection the page still works; only the typefaces fall back to system fonts.

## Deployment

The website is designed for static hosting with GitHub Pages. Publishing is handled from the repository that serves the live site.

## Potential improvements

- Serve a smaller, pre-cropped portrait to reduce the image payload
- Self-host the fonts to remove the last CDN dependency
- Add automated checks only if the project grows beyond the current static setup

## Author

Daniel Navarro Delgado

- [LinkedIn](https://www.linkedin.com/in/daniel-navarro-delgado)
- [GitHub](https://github.com/danielnavarro1600)
- [Website](https://danielnavarro1600.github.io)

## License

This repository contains a personal portfolio. Unless a license is added explicitly, the source code and content should not be assumed to be available for reuse.
