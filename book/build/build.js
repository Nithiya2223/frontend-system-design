#!/usr/bin/env node
/**
 * Build pipeline: chapter HTML  ->  highlighted code + Mermaid SVG  ->  PDFs.
 *
 *   npm run build
 *
 * Outputs (in /book/output):
 *   Chapter-NN-<slug>.pdf              one per chapter
 *   Frontend-System-Design-Book.pdf    cover + table of contents + list of figures + all chapters
 *
 * Steps
 *   1. Discover src/chapters/NN-<slug>.html (sorted by NN); check against src/chapters.json.
 *   2. Lint Mermaid sources (max 12 nodes, every arrow labelled).
 *   3. Highlight code with highlight.js; render Mermaid to inline SVG (local bundle, no network).
 *   4. Number headings (1.2, 1.2.3) and figures (Figure 1.2.3), fill in figure references.
 *   5. Print every chapter to PDF; verify no figure/table/short code block/callout crosses a page.
 *   6. Print the full book. TOC and List of figures page numbers are read back from the PDF
 *      (named destinations) and the result is verified against a second render.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const CHAPTERS_DIR = path.join(SRC, 'chapters');
const CODE_DIR = path.join(ROOT, 'code');
const OUT = path.join(ROOT, 'output');
const TMP = path.join(ROOT, '.build');
const BOOK_PDF = 'Frontend-System-Design-Book.pdf';

const LONG_CODE_LINES = 30; // blocks longer than this may split across pages
const MAX_DIAGRAM_NODES = 12;

function fail(message) {
  console.error(`\nBUILD FAILED: ${message}\n`);
  process.exit(1);
}

/* ------------------------------ dependencies ------------------------------ */

function requireOrFail(name) {
  try {
    return require(name);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') fail(`Cannot load "${name}". Run "npm install" in ${ROOT} first.`);
    throw e;
  }
}

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try {
      return require(name);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') throw e;
    }
  }
  return fail('Cannot load "playwright". Run "npm install" in ' + ROOT + ' first.');
}

/** Locate the local Mermaid browser bundle without relying on package "exports". */
function findMermaidBundle() {
  for (const dir of require.resolve.paths('mermaid') || []) {
    const candidate = path.join(dir, 'mermaid', 'dist', 'mermaid.min.js');
    if (fs.existsSync(candidate)) return candidate;
  }
  return fail('Cannot find mermaid/dist/mermaid.min.js. Run "npm install" in ' + ROOT + ' first.');
}

/* --------------------------------- helpers -------------------------------- */

const decodeEntities = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeCssString = (s) =>
  s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');

/* ------------------------------ PDF inspection ----------------------------- */
/* Chromium (Skia) writes plain, uncompressed PDF objects, so a light parser is enough. */

/**
 * Returns { pageCount, pageOfDest: Map<anchorId, 1-based page> }.
 * Named destinations exist for every anchor that some <a href="#id"> links to.
 */
function inspectPdf(buffer) {
  const text = buffer.toString('latin1');
  const objs = new Map();
  const objRe = /(\d+) 0 obj\s([\s\S]*?)endobj/g;
  let m;
  while ((m = objRe.exec(text))) objs.set(Number(m[1]), m[2]);

  let catalog = null;
  for (const body of objs.values()) {
    if (/\/Type\s*\/Catalog/.test(body)) {
      catalog = body;
      break;
    }
  }
  if (!catalog) throw new Error('PDF has no catalog object');

  const pageIndex = new Map();
  const walk = (num) => {
    const body = objs.get(num) || '';
    if (/\/Type\s*\/Pages(?![A-Za-z])/.test(body)) {
      const kids = /\/Kids\s*\[([^\]]*)\]/.exec(body);
      for (const k of (kids ? kids[1] : '').matchAll(/(\d+) 0 R/g)) walk(Number(k[1]));
    } else if (/\/Type\s*\/Page(?![A-Za-z])/.test(body)) {
      pageIndex.set(num, pageIndex.size + 1);
    }
  };
  walk(Number(/\/Pages\s+(\d+) 0 R/.exec(catalog)[1]));

  const pageOfDest = new Map();
  const dests = /\/Dests\s+(\d+) 0 R/.exec(catalog);
  if (dests) {
    const body = objs.get(Number(dests[1])) || '';
    for (const d of body.matchAll(/\/([^\s/[\]<>()]+)\s*\[\s*(\d+) 0 R/g)) {
      if (pageIndex.has(Number(d[2]))) pageOfDest.set(d[1], pageIndex.get(Number(d[2])));
    }
  }
  return { pageCount: pageIndex.size, pageOfDest };
}

/** Every marked block (figure, table, short code, callout, cheat sheet) must start and end on one page. */
function findSplits(info, chapters) {
  const problems = [];
  for (const c of chapters) {
    for (const mk of c.marks) {
      const a = info.pageOfDest.get(mk.start);
      const b = info.pageOfDest.get(mk.end);
      if (a === undefined || b === undefined) problems.push(`${c.file}: cannot locate ${mk.kind} "${mk.label}"`);
      else if (a !== b) problems.push(`${c.file}: ${mk.kind} "${mk.label}" is split across pages ${a} and ${b}`);
    }
  }
  return problems;
}

/* ------------------------------ chapter model ----------------------------- */

function discoverChapters() {
  const roadmap = JSON.parse(fs.readFileSync(path.join(SRC, 'chapters.json'), 'utf8')).chapters;
  const files = fs
    .readdirSync(CHAPTERS_DIR)
    .map((f) => ({ f, m: /^(\d+)-([a-z0-9-]+)\.html$/.exec(f) }))
    .filter((x) => x.m)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]));

  if (files.length === 0) fail(`No chapters found in ${CHAPTERS_DIR} (expected NN-slug.html).`);

  return files.map(({ f, m }) => {
    const source = fs.readFileSync(path.join(CHAPTERS_DIR, f), 'utf8');
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(source);
    if (!h1) fail(`${f}: every chapter needs an <h1> with the chapter title.`);
    const number = Number(m[1]);
    const entry = roadmap.find((r) => r.number === number);
    if (!entry) fail(`${f}: chapter ${number} is not listed in src/chapters.json.`);
    if (entry.slug !== m[2]) fail(`${f}: slug "${m[2]}" differs from chapters.json ("${entry.slug}").`);
    const num = String(number).padStart(2, '0');
    return {
      file: f,
      id: `ch${num}`,
      number,
      num,
      slug: m[2],
      title: decodeEntities(h1[1].replace(/<[^>]+>/g, '').trim()),
      source,
      pdfName: `Chapter-${num}-${m[2]}.pdf`,
    };
  });
}

/* ---------------------------- Mermaid lint (rules) ------------------------- */

const ARROW = /(-->|---|==>|-\.->|<-->)/;

/** Enforces the STYLE.md diagram rules that can be checked without rendering. */
function lintMermaid(def) {
  const problems = [];
  const lines = def
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const type = (lines[0] || '').split(/\s+/)[0];

  if (type === 'flowchart' || type === 'graph') {
    const ids = new Set();
    for (const l of lines.slice(1)) {
      if (/^(subgraph|end$|direction|classDef|class |style|linkStyle|%%)/.test(l)) continue;
      if (/(-->|---|==>|-\.->)(?!\|)/.test(l)) problems.push(`unlabelled arrow: ${l}`);
      for (const seg of l.split(/\s*(?:-->|---|==>|-\.->)(?:\|(?:"[^"]*"|[^|]*)\|)?\s*/)) {
        const id = /^([A-Za-z_][\w]*)/.exec(seg.trim());
        if (id) ids.add(id[1]);
      }
    }
    if (ids.size > MAX_DIAGRAM_NODES) problems.push(`${ids.size} nodes (max ${MAX_DIAGRAM_NODES})`);
  } else if (type === 'sequenceDiagram') {
    const parts = new Set();
    for (const l of lines.slice(1)) {
      const p = /^(?:participant|actor)\s+(\w+)/.exec(l);
      if (p) parts.add(p[1]);
      if (/^\w+\s*(-->>|->>|--x|-x|--\)|-\)|-->|->)/.test(l) && !/:\s*\S/.test(l)) problems.push(`unlabelled message: ${l}`);
    }
    if (parts.size > MAX_DIAGRAM_NODES) problems.push(`${parts.size} participants (max ${MAX_DIAGRAM_NODES})`);
  } else if (type === 'stateDiagram-v2' || type === 'stateDiagram') {
    const states = new Set();
    for (const l of lines.slice(1)) {
      if (!l.includes('-->')) continue;
      if (!/:\s*\S/.test(l)) problems.push(`unlabelled transition: ${l}`);
      for (const seg of l.split(/\s*-->\s*/)) {
        const id = /^([A-Za-z_][\w]*)/.exec(seg.trim());
        if (id) states.add(id[1]);
      }
    }
    if (states.size > MAX_DIAGRAM_NODES) problems.push(`${states.size} states (max ${MAX_DIAGRAM_NODES})`);
  } else {
    problems.push(`unsupported diagram type "${type}" (use flowchart, sequenceDiagram or stateDiagram-v2)`);
  }
  return problems;
}

function lintChapter(chapter) {
  const problems = [];
  const re = /<pre[^>]*class="[^"]*\bmermaid\b[^"]*"[^>]*>([\s\S]*?)<\/pre>/g;
  let m;
  let n = 0;
  while ((m = re.exec(chapter.source))) {
    n += 1;
    for (const p of lintMermaid(decodeEntities(m[1]))) problems.push(`${chapter.file}: diagram #${n}: ${p}`);
  }
  return problems;
}

/* ------------------------------ code highlighting -------------------------- */

/** Highlight every <pre><code class="language-x"> block (optionally loading code/<data-src>). */
function highlightCode(chapter, hljs) {
  const re = /<pre>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/g;
  return chapter.source.replace(re, (whole, attrs, body) => {
    const lang = /class="[^"]*\blanguage-([\w+-]+)/.exec(attrs);
    if (!lang) fail(`${chapter.file}: <code> block without a class="language-xxx".`);
    const language = lang[1];
    if (!hljs.getLanguage(language)) fail(`${chapter.file}: highlight.js has no language "${language}".`);

    let raw;
    const src = /data-src="([^"]+)"/.exec(attrs);
    if (src) {
      const full = path.resolve(CODE_DIR, src[1]);
      if (!full.startsWith(CODE_DIR + path.sep)) fail(`${chapter.file}: data-src must stay inside /code.`);
      if (!fs.existsSync(full)) fail(`${chapter.file}: data-src file not found: code/${src[1]}`);
      raw = fs.readFileSync(full, 'utf8');
    } else {
      raw = decodeEntities(body);
    }
    raw = raw.replace(/^\n+/, '').replace(/\s+$/, '');

    const html = hljs.highlight(raw, { language, ignoreIllegals: true }).value;
    const long = raw.split('\n').length > LONG_CODE_LINES ? ' long' : '';
    const label = src ? ` data-file="code/${escapeHtml(src[1])}"` : '';
    return `<div class="codeblock${long}"${label}><pre><code class="hljs language-${language}">${html}</code></pre></div>`;
  });
}

const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'base', // greys only, so diagrams survive black-and-white printing
  securityLevel: 'strict',
  themeVariables: {
    fontFamily: '"Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: '16px',
    background: '#ffffff',
    primaryColor: '#ffffff',
    primaryTextColor: '#000000',
    primaryBorderColor: '#000000',
    secondaryColor: '#eeeeee',
    secondaryTextColor: '#000000',
    secondaryBorderColor: '#000000',
    tertiaryColor: '#ffffff',
    tertiaryTextColor: '#000000',
    tertiaryBorderColor: '#000000',
    lineColor: '#000000',
    textColor: '#000000',
    mainBkg: '#ffffff',
    nodeBorder: '#000000',
    clusterBkg: '#f2f2f2',
    clusterBorder: '#000000',
    edgeLabelBackground: '#ffffff',
    noteBkgColor: '#f2f2f2',
    noteTextColor: '#000000',
    noteBorderColor: '#000000',
    actorBkg: '#ffffff',
    actorBorder: '#000000',
    actorTextColor: '#000000',
    actorLineColor: '#000000',
    signalColor: '#000000',
    signalTextColor: '#000000',
    labelBoxBkgColor: '#ffffff',
    labelBoxBorderColor: '#000000',
    labelTextColor: '#000000',
    loopTextColor: '#000000',
    activationBkgColor: '#e5e5e5',
    activationBorderColor: '#000000',
  },
  flowchart: { htmlLabels: false, useMaxWidth: true, curve: 'basis' },
  sequence: { useMaxWidth: true },
};

/* ------------------- in-browser numbering, figures, markers ---------------- */

/** Runs inside the page after Mermaid has rendered. Must be self-contained. */
function decorateInPage({ chapterNo }) {
  const root = document.getElementById('chapter');
  const headings = [];
  const figures = [];
  const marks = [];
  let part = 0;
  let topic = 0;
  let sub = 0;
  let fig = 0;
  let inTopic = false;
  const labels = new Map();

  for (const el of Array.from(root.querySelectorAll('h2, h3, figure.diagram'))) {
    if (el.tagName === 'H2') {
      if (el.classList.contains('part')) {
        part += 1;
        inTopic = false;
        el.id = el.id || `p-${chapterNo}-${part}`;
        headings.push({ level: 2, id: el.id, text: el.textContent.trim() });
      } else {
        topic += 1;
        sub = 0;
        fig = 0;
        inTopic = true;
        const label = `${chapterNo}.${topic}`;
        el.id = `h-${chapterNo}-${topic}`;
        el.insertAdjacentHTML('afterbegin', `<span class="num">${label}</span>`);
        headings.push({ level: 2, id: el.id, text: `${label}  ${el.textContent.replace(label, '').trim()}`, label });
      }
    } else if (el.tagName === 'H3') {
      if (!inTopic || el.classList.contains('q')) continue;
      sub += 1;
      const label = `${chapterNo}.${topic}.${sub}`;
      el.id = `h-${chapterNo}-${topic}-${sub}`;
      el.insertAdjacentHTML('afterbegin', `<span class="num">${label}</span>`);
      headings.push({ level: 3, id: el.id, text: `${label}  ${el.textContent.replace(label, '').trim()}`, label });
    } else {
      fig += 1;
      const label = `Figure ${chapterNo}.${inTopic ? topic : 0}.${fig}`;
      if (!el.id) throw new Error(`a figure in topic ${topic} has no id (needed for references)`);
      const cap = el.querySelector('figcaption');
      if (!cap) throw new Error(`figure #${el.id} has no <figcaption>`);
      const captionText = cap.textContent.trim();
      cap.innerHTML = `<span class="figlabel">${label}.</span> ${cap.innerHTML}`;
      labels.set(el.id, label);
      figures.push({ id: el.id, label, caption: captionText });
    }
  }

  const referenced = new Set();
  for (const a of Array.from(root.querySelectorAll('a.figref'))) {
    const id = (a.getAttribute('href') || '').slice(1);
    if (!labels.has(id)) throw new Error(`figure reference to unknown figure "#${id}"`);
    a.textContent = labels.get(id);
    referenced.add(id);
  }
  const unreferenced = figures.filter((f) => !referenced.has(f.id)).map((f) => f.label);
  if (unreferenced.length) throw new Error(`figures never referenced in the text: ${unreferenced.join(', ')}`);

  let n = 0;
  const blocks = root.querySelectorAll('figure.diagram, table, .codeblock:not(.long), .callout, section.cheatsheet');
  for (const el of Array.from(blocks)) {
    n += 1;
    const s = document.createElement('span');
    const e = document.createElement('span');
    s.id = `mk-${n}-s`;
    e.id = `mk-${n}-e`;
    s.className = e.className = 'pgm';
    if (el.tagName === 'TABLE') {
      const cells = el.querySelectorAll('th, td');
      cells[0].prepend(s);
      cells[cells.length - 1].append(e);
    } else {
      el.prepend(s);
      el.append(e);
    }
    const labelEl = el.querySelector('figcaption') || el.querySelector('caption') || el.querySelector('h2');
    let kind = el.tagName === 'FIGURE' ? 'figure' : el.tagName === 'TABLE' ? 'table' : 'block';
    if (el.classList.contains('codeblock')) kind = 'code block';
    if (el.classList.contains('callout')) kind = 'callout';
    if (el.classList.contains('cheatsheet')) kind = 'cheat sheet';
    marks.push({
      start: s.id,
      end: e.id,
      kind,
      label: ((labelEl && labelEl.textContent) || el.textContent).replace(/\s+/g, ' ').trim().slice(0, 60),
    });
  }

  return { html: root.innerHTML, headings, figures, marks };
}

/* ------------------------------- HTML pieces ------------------------------ */

const NOTES_HTML = `<section class="notes"><h2 class="part notes-title">Notes</h2><div class="lines"></div></section>`;

function pageCss(chapters) {
  return chapters
    .map(
      (c) =>
        `@page ${c.id} { @top-center { content: "${escapeCssString(c.title)}"; } }\n` +
        `section.pg-${c.id} { page: ${c.id}; }`
    )
    .join('\n');
}

function documentHtml(title, chapters, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="../src/book.css">
<style>
${pageCss(chapters)}
</style></head>
<body>
${body}
</body></html>`;
}

/** Hidden links so Chromium records a page destination for every marker. */
const markerLinks = (c) =>
  `<div class="pgm-links">${c.marks
    .map((m) => `<a href="#${m.start}"></a><a href="#${m.end}"></a>`)
    .join('')}</div>`;

const chapterSection = (c) =>
  `<section class="chapter pg-${c.id}" id="${c.id}">\n${c.html}\n${NOTES_HTML}\n${markerLinks(c)}\n</section>`;

function coverHtml(meta) {
  return `<section class="cover">
<div class="bar"></div>
<h1>${escapeHtml(meta.title)}</h1>
<p class="subtitle">${escapeHtml(meta.subtitle)}</p>
<p class="tagline">${escapeHtml(meta.tagline || '')}</p>
</section>`;
}

/** Table of contents (chapter, topics, subtopics) followed by each chapter's list of figures. */
function tocHtml(chapters, pageOf) {
  const row = (cls, id, text) =>
    `<li class="${cls}"><a href="#${id}"><span class="t">${escapeHtml(text)}</span><span class="dots"></span><span class="p">${pageOf(id)}</span></a></li>`;
  const parts = chapters.map((c) => {
    const rows = [row('l0', c.id, c.title)];
    for (const h of c.headings) rows.push(row(h.level === 2 ? 'l1' : 'l2', h.id, h.text));
    const figs = c.figures.map((f) => row('lf', f.id, `${f.label}  ${f.caption}`));
    return (
      `<ol class="toc-list">\n${rows.join('\n')}\n</ol>` +
      (figs.length
        ? `\n<h2 class="lof-title">List of figures: ${escapeHtml(c.title)}</h2>\n<ol class="toc-list lof">\n${figs.join('\n')}\n</ol>`
        : '')
    );
  });
  return `<section class="toc"><h1>Contents</h1>\n${parts.join('\n')}\n</section>`;
}

/* ---------------------------------- main ---------------------------------- */

async function main() {
  const meta = JSON.parse(fs.readFileSync(path.join(SRC, 'book.json'), 'utf8'));
  const hljs = requireOrFail('highlight.js');
  const mermaidBundle = findMermaidBundle();
  const { chromium } = loadPlaywright();

  const chapters = discoverChapters();
  const lint = chapters.flatMap(lintChapter);
  if (lint.length) fail(`Diagram rule violations:\n  - ${lint.join('\n  - ')}`);

  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: typeof process.getuid === 'function' && process.getuid() === 0 ? ['--no-sandbox'] : [],
  });

  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: 'print' });

    const open = async (name, html) => {
      const file = path.join(TMP, `${name}.html`);
      fs.writeFileSync(file, html);
      await page.goto('file://' + file, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
    };

    const printPdf = async (name, html, outFile) => {
      await open(name, html);
      const buffer = await page.pdf({
        preferCSSPageSize: true, // A4 + margins come from book.css
        printBackground: true,
        displayHeaderFooter: false, // header/footer are CSS @page margin boxes
        outline: true,
        tagged: true,
      });
      if (outFile) fs.writeFileSync(outFile, buffer);
      return inspectPdf(buffer);
    };

    /* Stage 1: highlight code, render Mermaid, number headings and figures. */
    for (const c of chapters) {
      console.log(`[1/3] Rendering ${c.file}`);
      const withCode = highlightCode(c, hljs);
      await open(`stage-${c.id}`, documentHtml(c.title, [], `<main id="chapter">${withCode}</main>`));

      if (/<pre[^>]*class="[^"]*\bmermaid\b/.test(withCode)) {
        await page.addScriptTag({ path: mermaidBundle });
        try {
          await page.evaluate(
            async ({ config, prefix }) => {
              window.mermaid.initialize(config);
              let n = 0;
              for (const el of Array.from(document.querySelectorAll('pre.mermaid'))) {
                n += 1;
                try {
                  const { svg } = await window.mermaid.render(`${prefix}-${n}`, el.textContent.trim());
                  const holder = document.createElement('div');
                  holder.className = 'mermaid-svg';
                  holder.innerHTML = svg;
                  const svgEl = holder.querySelector('svg');
                  const vb = (svgEl.getAttribute('viewBox') || '').split(/[\s,]+/);
                  if (vb.length === 4) svgEl.style.setProperty('--w', `${vb[2]}px`);
                  el.replaceWith(holder);
                } catch (err) {
                  throw new Error(`diagram #${n}: ${err && err.message ? err.message : err}`);
                }
              }
            },
            { config: MERMAID_CONFIG, prefix: `mmd-${c.id}` }
          );
        } catch (err) {
          fail(`${c.file}: Mermaid render error, ${err.message}`);
        }
      }
      try {
        Object.assign(c, await page.evaluate(decorateInPage, { chapterNo: c.number }));
      } catch (err) {
        fail(`${c.file}: ${err.message}`);
      }
      console.log(
        `      ${c.headings.filter((h) => h.level === 2).length} headings (H2), ` +
          `${c.headings.filter((h) => h.level === 3).length} subtopics (H3), ${c.figures.length} figures`
      );
    }

    /* Stage 2: one PDF per chapter, with the page-split check. */
    for (const stale of fs.readdirSync(OUT)) {
      if (/^Chapter-\d+-.*\.pdf$/.test(stale) && !chapters.some((c) => c.pdfName === stale)) {
        fs.unlinkSync(path.join(OUT, stale));
      }
    }
    const problems = [];
    for (const c of chapters) {
      const info = await printPdf(`pdf-${c.id}`, documentHtml(c.title, [c], chapterSection(c)), path.join(OUT, c.pdfName));
      c.pages = info.pageCount;
      console.log(`[2/3] ${c.pdfName}  (${c.pages} pages)`);
      problems.push(...findSplits(info, [c]));
    }

    /* Stage 3: full book. Render, read page numbers back, re-render with real numbers, verify. */
    const allIds = chapters.flatMap((c) => [c.id, ...c.headings.map((h) => h.id), ...c.figures.map((f) => f.id)]);
    const bookBody = (pageOf) =>
      coverHtml(meta) + '\n' + tocHtml(chapters, pageOf) + '\n' + chapters.map(chapterSection).join('\n');
    const bookHtml = (pageOf) =>
      documentHtml(`${meta.title}: ${meta.subtitle}`, chapters, bookBody(pageOf));

    let pages = new Map(allIds.map((id) => [id, 999])); // placeholder keeps the TOC the same size
    let info = null;
    let stable = false;
    for (let pass = 1; pass <= 3 && !stable; pass += 1) {
      info = await printPdf('pdf-book', bookHtml((id) => pages.get(id)), path.join(OUT, BOOK_PDF));
      const missing = allIds.filter((id) => !info.pageOfDest.has(id));
      if (missing.length) fail(`No page found in the book PDF for: ${missing.slice(0, 5).join(', ')}`);
      const next = new Map(allIds.map((id) => [id, info.pageOfDest.get(id)]));
      stable = allIds.every((id) => next.get(id) === pages.get(id));
      pages = next;
    }
    if (!stable) fail('TOC page numbers did not settle after 3 passes.');
    console.log(`[3/3] ${BOOK_PDF}  (${info.pageCount} pages, TOC verified against the final PDF)`);
    problems.push(...findSplits(info, chapters));

    if (problems.length) fail(`Page-split problems:\n  - ${[...new Set(problems)].join('\n  - ')}`);

    const expected = [...chapters.map((c) => c.pdfName), BOOK_PDF];
    for (const name of expected) {
      const stat = fs.existsSync(path.join(OUT, name)) && fs.statSync(path.join(OUT, name));
      if (!stat || stat.size === 0) fail(`Missing or empty output: ${name}`);
    }

    console.log('\nOutput files in ' + OUT);
    for (const name of expected) {
      console.log(`  ${name}  ${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0)} KB`);
    }
    console.log('\nChapters:');
    for (const c of chapters) console.log(`  p.${String(pages.get(c.id)).padStart(3)}  ${c.title}  (${c.pages} pages)`);
    console.log('\nChecks passed: diagram lint, figure references, page-split check, TOC page numbers.');
  } finally {
    await browser.close();
  }
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
