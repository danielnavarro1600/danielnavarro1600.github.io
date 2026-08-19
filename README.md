# Daniel Navarro Delgado | Professional Website

Personal portfolio website presenting my experience at the intersection of finance, enterprise technology and applied artificial intelligence.

## Live website

[Visit the professional website](https://danielnavarro1600.github.io)

## Overview

This is a lightweight, single-page website built without a framework or build process. The current version keeps the structure, styling and interactivity in one `index.html` file so it can be opened locally and deployed directly to GitHub Pages.

The website is organised as a single narrative: what I can solve, what I have built, where I have worked, what I studied, what I keep learning, how I work, and how to reach me.

Sections and anchors:

| Anchor | Section |
| --- | --- |
| `#hero` | Value proposition, portrait and headline figures |
| `#skills` | Capabilities, the data-to-decision flow and the technical stack |
| `#projects` | Client projects, internal initiatives and personal tools |
| `#experience` | Career timeline |
| `#education` | Degrees and languages |
| `#certifications` | Filterable certification index (34 entries, three tracks) |
| `#approach` | How I work |
| `#contact` | Email and professional links |

Features:

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
- Font Awesome
- Google Fonts
- GitHub Pages

## Project structure

```text
danielnavarro1600.github.io/
├── .github/workflows/static.yml
├── CLAUDE.md
├── README.md
├── img/
│   ├── favicon.png
│   ├── foto-perfil.jpg
│   └── logo.jpg
└── index.html
```

## Run locally

No installation or package manager is required.

1. Download or clone the repository.
2. Open `index.html` in a web browser.

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

Before making substantial changes, create a Git branch or a backup copy of `index.html`. Review and test each change locally before publishing it.

## External resources

The page loads fonts and icons from external services. All images (profile photo, favicon and social preview) are hosted locally in `img/`. An internet connection is required for fonts and icons to display correctly.

## Deployment

The website is designed for static hosting with GitHub Pages. Publishing is handled from the repository that serves the live site.

## Potential improvements

- Link the FP&A assessment tool to its direct GitHub Pages URL (the card currently points to the GitHub profile)
- Serve a smaller, pre-cropped portrait to reduce the image payload
- Self-host the fonts and icons to remove the CDN dependency
- Separate CSS and JavaScript if the project becomes harder to maintain
- Add automated checks only if the project grows beyond the current static setup

## Author

Daniel Navarro Delgado

- [LinkedIn](https://www.linkedin.com/in/daniel-navarro-delgado)
- [GitHub](https://github.com/danielnavarro1600)
- [Website](https://danielnavarro1600.github.io)

## License

This repository contains a personal portfolio. Unless a license is added explicitly, the source code and content should not be assumed to be available for reuse.
