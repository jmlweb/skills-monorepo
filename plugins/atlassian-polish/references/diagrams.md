# Diagrams

Read for every page before the rewrite is final.

## 0. When a diagram is required

Draw one whenever the content meets at least one trigger. Not optional, not "when there is
time". Skip only when none applies; never add one as decoration. Borderline: would a reader
have to sketch this on paper to follow it? Then draw it.

1. **Complex problem:** a flow, architecture, state machine or cause chain that takes more
   than a few sentences to follow (multiple systems, steps or branches).
2. **Relationships:** how tickets or elements depend on, block or contain each other (epic
   with ≥ 3 children linked by order or dependency, cross-team handoffs).
3. **Concept:** an abstract idea the text only describes (model, boundary).
4. **Sequence over time:** calls between systems or teams, rollout or migration phases.
   Use a sequence or phase layout, not boxes and arrows.
5. **Branching logic:** decision trees, error and retry paths, acceptance criteria with
   if/else.
6. **Current vs target state:** before/after architecture or flow, side by side.
7. **Data model or contract:** entities and relations, API payload shape.
8. **UI change with no screenshot:** a wireframe sketch; alt text says "sketch".

A table or list is not a substitute when a trigger applies. Output form: ASCII in a code block
if it fits 70 columns; otherwise SVG → PNG → upload → embed (§1-§6). Already has a diagram
that covers the trigger → keep it. Tools unavailable (no renderer, REST declined) → keep the
ASCII version or list the missing diagram in the report; never silently skip.

### Do not draw

- Flat lists with no relations, or a single step / plain A→B.
- Numbers or statuses that go stale: use a table.
- Existing screenshots or images: keep and re-embed with alt text, never redraw.
- Photos or illustrations: never fabricate UI screenshots.

### Integrity

- Every box and arrow traces to the source text or a ticket link. No invented dependencies.
- Inferred element: dashed line, label "(unverified)", and list it in UNVERIFIED.
- At most 3 diagrams per page, one idea each.

## 1. SVG hygiene

- XML-escape `&`, `<`, `>`, `"` in every `<text>` (`T&amp;C`). One bare `&` aborts the
  conversion.
- `font-family="Helvetica, Arial, sans-serif"`: converters lack custom fonts.
- White background (`<rect width="100%" height="100%" fill="#fff"/>`): PNG alpha renders black
  in dark themes.
- No external fonts, images or `<use href="http…">`: converters don't fetch them.

## 2. Layout defaults

- Lanes grouped by area or flow; a one-line legend at the bottom.
- At most ~15 boxes. More → split into two diagrams.
- Arrows never cross a box; route around it.
- Labels short enough not to clip. Text in boxes ≥ 12 px at 1× scale.
- No statuses, dates or owners: they go stale and can't be edited as text. One exception below.

## 3. Done-only marker

Finished items may carry a badge: green circle (`<circle r="8" fill="#2e7d32"/>`) with a white
tick (`<path stroke="#fff" fill="none"/>`) centered on the box's top-right corner. Add
"green tick = done" to the legend. Draw it as SVG shapes, never an emoji glyph: converters
often lack a colour emoji font and print an empty box. No other statuses.

## 4. Render

Check what exists first: `command -v rsvg-convert magick inkscape`. Render at 2× so the
image stays sharp when Jira/Confluence scale it:

| Tool | Command |
|------|---------|
| rsvg-convert | `rsvg-convert -z 2 in.svg -o out.png` (or `-w 2400`) |
| magick | `magick -density 192 in.svg out.png` |
| inkscape | `inkscape in.svg --export-dpi=192 --export-filename=out.png` |

Embed at `width=1200` (the 2400 px PNG shows at half size, crisp on high-DPI screens).

## 5. Self-check (before uploading)

1. `Read` the rendered PNG.
2. Look for: an arrow through a box, clipped text, overlapping labels, missing legend.
3. Fix the SVG, re-render, repeat until clean.

## 6. Keep the source

Keep the SVG (or the script that generates it). Upload it next to the PNG with the same base
name (`flow.svg` beside `flow.png`) so anyone can regenerate the diagram without the original
session. Use the attachment flow in `atlassian-formats.md` §4.
