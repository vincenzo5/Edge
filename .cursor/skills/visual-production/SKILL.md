---
name: visual-production
description: Orchestrate visual asset production for the Edge landing page. Coordinates LogoLoom (brand identity), QuiverAI (icons), Dashmotion (animations), and Superdesign (mockups) in the correct production order. Use when starting visual asset production for the landing page, when the user asks to generate logos/icons/mockups/animations, or when the edge-landing-page skill reaches Phase 2 (Visual & Interactive).
---

# Visual Production Orchestrator

Coordinates the four visual asset tools in the correct production order. Called by the `edge-landing-page` skill when it reaches Phase 2, or directly when the user asks to produce visual assets.

## Prerequisites

Before starting, verify:

1. **Design tokens exist** — read `docs/foundation/design-system.md` for colors, fonts, motion specs. If missing, halt and create it first.
2. **MCP servers are connected** — LogoLoom and QuiverAI should appear as available MCP tools. If not, check `.cursor/mcp.json`.
3. **Dashmotion skill is present** — should be in `.cursor/skills/dashmotion/`.
4. **Output directories exist** — create `public/brand/`, `public/icons/`, `public/mockups/`, `public/animations/` if missing.

## Production Order

Execute phases sequentially. Each phase depends on the previous one.

### Phase 1: Brand Identity (Assets 1.1, 1.2, 1.3)

**Tool:** LogoLoom MCP

1. Call `text_to_path` with the logo SVG:
   - Font: Space Grotesk Bold
   - Text: "Edge"
   - Accent: Electric Green (#00FF88) on the "E" — a small signal mark or green stroke
2. Call `optimize_svg` on the result
3. Call `export_brand_kit` — this generates all 31 files:
   - SVG variants (full logo, icon only, wordmark only, light/dark/mono)
   - PNG sizes (16px–1024px)
   - ICO favicon
   - OG image (1200×630)
   - BRAND.md with color codes and usage guidelines
4. Save to `public/brand/`

**Verification:** Open `public/brand/BRAND.md` and confirm:
- Electric Green (#00FF88) appears in the palette
- All PNG sizes exported correctly
- Favicon.ico exists
- OG image is 1200×630

### Phase 2: Custom Icons (Assets 3.1–3.6)

**Tool:** QuiverAI MCP

1. Call `list_models` to find available SVG generation models
2. For each of the 6 icons, call `create_generation` with the prompt from `visual-assets/SKILL.md`
3. Poll `get_task` until each generation completes
4. Call `get_creation_content` to retrieve SVG source
5. Optimize: ensure viewBox is 24×24, stroke-based, no fills except accent gradient
6. Save to `public/icons/` with filenames: `pain-chart.svg`, `pain-fragmented.svg`, `pain-asymmetry.svg`, `feat-unified.svg`, `feat-ai.svg`, `feat-context.svg`

**Style consistency check:** All 6 icons should share:
- Same stroke weight (1.5px)
- Same viewBox (24×24)
- Electric Green (#00FF88) accent on one key element per icon
- No fill colors except the green accent gradient
- Dark surface-compatible colors for non-accent strokes

### Phase 3: Product Mockup (Asset 2.1)

**Tool:** Superdesign (web) + CSS

1. Open Superdesign or use its Cursor skill
2. Generate with prompt: "Dark finance trading dashboard — chart on left, AI research panel on right, deep dark background #0A0B0E, Electric Green #00FF88 accents, Bloomberg-terminal aesthetic, professional, data-dense but controlled"
3. Export the mockup image
4. Save to `public/mockups/hero-mockup.png`
5. In the landing page component, wrap in:
   - Dark device frame (CSS border + border-radius)
   - Green glow underneath (radial gradient at 5-10% opacity)
   - 3D tilt (CSS `transform: perspective(1000px) rotateY(-5deg)`)
   - Drop shadow (`box-shadow: 0 25px 50px rgba(0,0,0,0.5)`)

**Alternative:** If the actual product exists, take a screenshot and use Screenhance for the device frame treatment.

### Phase 4: Animated Diagrams (Assets 2.2, 2.3, 4.8)

**Tool:** Dashmotion skill

Follow the Dashmotion skill (`dashmotion/SKILL.md`) for each diagram.

**Asset 4.8 — Data Flow (Highest Priority):**
- Mode: Architecture
- 3 nodes: "Chart" (Frontend type) → "Edge" (Backend type) → "Research & AI" (Database type)
- 2–4 traveling dots in #00FF88, chained `begin` values for hop-by-hop animation
- Override default colors with Edge design tokens (see `dashmotion/references/architecture-mode.md`)
- Save to `public/animations/data-flow-dashmotion.html`

**Asset 2.3 — How It Works:**
- Mode: Flow
- 3 steps: "See the Setup" → "Ask the Question" → "Get the Full Picture"
- START pill, 3 activity nodes, END pill
- Override colors with Edge tokens
- Save to `public/animations/how-it-works-dashmotion.html`

**Integration:** Embed these HTML files in the landing page via `<iframe>` or extract the SVG and inline it directly.

### Phase 5: Verification

After all phases complete, verify:

- [ ] All assets in `public/` directories
- [ ] Brand kit has all 31 files
- [ ] 6 icon SVGs are consistent in style
- [ ] Hero mockup exists with device frame treatment
- [ ] Both animated diagrams render correctly in browser
- [ ] All assets use Edge design tokens (no off-brand colors)
- [ ] No asset exceeds performance budget (individual SVGs < 10KB, animations < 50KB)

## Updating the Visual Assets Doc

After production, update `docs/execution/landing-page/visual-assets.md`:
- Check off completed assets in the V1/V2 production plan
- Add actual file paths and sizes
- Note any deviations from the original spec
