# Content style (applies to every chapter)

## Tone
- Simple, precise, no filler. Short paragraphs. Explain the "why" before the "how".
- Reader: frontend developer, 3 years of experience, Angular background, also Node.js.
- Write everything originally, in your own words. Never reproduce course, book or website content. Sources are for facts, not wording.

## Hierarchy (three levels, numbered by the build)
| Level | Markup | Example |
| --- | --- | --- |
| Chapter | `<h1>` | Chapter 1: Networking |
| Topic | `<h2>` (numbered automatically) | 1.2 Network layers |
| Subtopic | `<h3>` (numbered automatically) | 1.2.4 Encapsulation and decapsulation |
| Template section | `<h2 class="part">` (not numbered) | Chapter at a glance, Trade-offs |

- Do not type numbers into headings. The build adds them.
- Every bullet of a chapter outline becomes its own `<h3>` with a short explanation. Never collapse several bullets into one paragraph.
- Each topic (`<h2>`) starts with a 2-line `<p class="overview">` saying what it covers and why it matters.
- Interview questions use `<h3 class="q">` (unnumbered, not in the TOC).
- The table of contents shows all three levels with page numbers, followed by a List of figures per chapter.

## Chapter template (use exactly this order)
1. **Chapter at a glance**: 5-line summary and key terms.
2. **Core concepts**: numbered topics and subtopics. **Diagrams are embedded inline here**, not in a separate section.
3. **Trade-offs table**: "use X when / avoid X when".
4. **Common mistakes**.
5. **Most-asked interview questions** with complete model answers: 15 to 18 for large chapters, at least 8 for small ones. Order basic to advanced. Each answer is structured and speakable in about 2 minutes.
6. **One-page cheat sheet**: scannable recap. It must fit on one page (the build fails if it does not).
7. **Further reading** (3 to 6 items), **Editorial notes** box, and the lined **Notes** page (added automatically).

Case-study chapters additionally follow **RADIO**: Requirements, Architecture, Data model, Interface, Optimizations.

## Diagram layout rules
- Pattern for every subtopic, in this order:
  1. Heading.
  2. Short explanation: the "why", then the "how".
  3. Diagram with a numbered caption (the build numbers it, for example "Figure 1.3.2").
  4. One or two sentences walking through the diagram step by step.
  5. The code example for that subtopic.
- Every `<h3>` has at least one diagram.
- Reference every figure from the text with `<a class="figref" href="#fig-id"></a>`. The build writes the figure number into the link and fails on unknown or unreferenced figures.
- Markup: `<figure class="diagram" id="fig-id"><pre class="mermaid">...</pre><figcaption>Caption text</figcaption></figure>`. Write `&lt;` for `<` and `&amp;` for `&`.
- Use the type that explains best:
  - sequence diagram for message exchanges
  - flowchart for decisions and processes (add one wherever a topic involves a decision or process)
  - state diagram for connection lifecycles
  - comparison diagram (flowchart with two or three `subgraph` blocks) for side-by-side differences
  - layered stacks that Mermaid cannot draw cleanly: an HTML `<table class="stack">` inside the figure
- At most 12 nodes per diagram. Label every arrow (`-->|"label"|`, sequence messages, state transitions). The build lints both rules.
- Black-and-white safe, large and legible. Quote flowchart labels (`A["text"]`). Avoid `;`, `#` and `<` in labels.
- A figure and its caption never split across pages (enforced by CSS, verified by the build).

## Code
- Plain JavaScript, HTML and CSS by default; React where relevant. Short, commented, runnable.
- Save files in `code/NN-slug/` with a README on how to run each. Prefer Node built-ins so scripts run without installing anything.
- Include a file in the chapter with `<pre><code class="language-javascript" data-src="NN-slug/file.js"></code></pre>`. Inline snippets must escape `<` and `&`.
- Run every runnable example before finishing. Say which examples were only syntax-checked.

## Rules
- Name the established pattern where relevant (Layered architecture, Observer / Pub-Sub, Singleton, Retry with backoff, Adapter, Facade, Backend-for-Frontend, Proxy) and say why it fits.
- **Accuracy:** if unsure about a fact, API or number, mark it with `VERIFY` instead of guessing.
- Callouts: `<aside class="callout key-idea">`, `common-mistake`, `interview-tip`.
- Black-and-white safe: never carry meaning by colour alone.
- Update `SOURCES.md` and set the chapter to `done` in `src/chapters.json`.

## Print layout (set in `src/book.css`)
A4 portrait, body 11pt, code 9pt, generous line spacing, wider left margin, header with chapter title, footer with page number, each chapter on a new page, lined Notes box at the end of each chapter. Figures, tables, short code blocks (30 lines or fewer), callouts and the cheat sheet never split across pages.
