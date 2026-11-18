# Frontend System Design: Interview Revision Guide

Print-ready book (A4, PDF). Chapters are HTML files. One command builds every chapter PDF and the full book.

## Install (once)

```bash
cd book
npm install
npx playwright install chromium
```

## Build

```bash
npm run build
```

Output goes to `output/`:

| File | Content |
| --- | --- |
| `Chapter-NN-<slug>.pdf` | One chapter |
| `Frontend-System-Design-Book.pdf` | Cover, table of contents with page numbers, all chapters |

The build needs no internet once `npm install` has run. Mermaid is rendered from the local `node_modules/mermaid` bundle.
Set `CHROMIUM_PATH` to use a specific Chromium binary instead of Playwright's.

## Layout

```
book/
  src/book.css           shared print stylesheet (A4, margins, callouts, notes box)
  src/book.json          cover title, subtitle, tagline
  src/chapters.json      chapter roadmap and status
  src/chapters/NN-slug.html   one file per chapter
  src/fonts/             bundled Source Code Pro (SIL OFL)
  code/<chapter>/        runnable examples (node code/00-sample/debounce.js)
  build/build.js         the pipeline
  output/                generated PDFs
  STYLE.md               content rules every chapter follows
```

## Writing a chapter

Follow `STYLE.md`. Create `src/chapters/NN-slug.html` listed in `src/chapters.json`. Start with one `<h1>`.
The build numbers topics (`<h2>`), subtopics (`<h3>`) and figures, and adds the running header, page footer, TOC, List of figures and the lined Notes box.

| Element | Markup |
| --- | --- |
| Diagram | `<figure class="diagram"><pre class="mermaid">flowchart LR ...</pre><figcaption>Figure 1.1: ...</figcaption></figure>` (write `&lt;` for `<`) |
| Code, inline | `<pre><code class="language-javascript">...escaped code...</code></pre>` |
| Code, from file | `<pre><code class="language-javascript" data-src="01-rendering/example.js"></code></pre>` (path is relative to `code/`) |
| Callouts | `<aside class="callout key-idea">`, `common-mistake`, or `interview-tip` |
| Cheat sheet | `<section class="cheatsheet"><h2>One-page cheat sheet</h2>...</section>` (starts on its own page) |

Code blocks over 30 lines may split across pages. Shorter ones, tables and diagrams never do. Long lines wrap.

## How the pipeline works

1. `highlight.js` highlights code at build time. Tokens use weight, italics and underline, not colour.
2. Headless Chromium renders each `pre.mermaid` to inline SVG with a greyscale theme.
3. Each chapter is printed to PDF, and its pages are counted.
4. The full book is printed with a TOC and List of figures. Page numbers are read back from the PDF's named destinations, and the book is re-rendered until they are stable.
5. Checks that fail the build: Mermaid diagrams over 12 nodes or with unlabelled arrows, unreferenced or unknown figure references, and any figure, table, short code block, callout or cheat sheet that crosses a page.

Headers and page numbers are CSS `@page` margin boxes, so they need a recent Chromium (131 or newer).
The TOC lists chapters only, not sub-headings.
