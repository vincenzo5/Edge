---
name: visual-assets
description: Generate visual assets for the Edge landing page — logos, icons, mockups, and animations. Use when creating or updating brand identity assets, custom SVG icons, product mockups, or animated data-flow visuals for the Edge project. Covers assets 1.1–1.3 (brand identity), 2.1–2.3 (product visuals), 3.1–3.6 (custom icons), and 4.8 (signature animation).
---

# Visual Assets Production

Asset inventory and production guide for the Edge landing page. Maps each visual asset to the correct tool and provides the context the agent needs to produce on-brand results.

## Asset-to-Tool Map

| Asset | Tool | Method |
|-------|------|--------|
| 1.1 Logo / Wordmark | LogoLoom MCP | `text_to_path` → `optimize_svg` → `export_brand_kit` |
| 1.2 Favicon | LogoLoom MCP | Included in brand kit export |
| 1.3 OG Image | LogoLoom MCP | Included in brand kit export |
| 2.1 Hero Product Mockup | Superdesign (web) | Generate mockup, then CSS for device frame + glow |
| 2.2 Solution Diagram | Dashmotion skill | Animated flow diagram |
| 2.3 How It Works Visuals | Dashmotion skill | Animated step flow |
| 3.1–3.6 Custom Icons | QuiverAI MCP | `create_generation` → `get_creation_content` |
| 4.8 Data Flow Animation | Dashmotion skill | Animated flow with traveling dots |

## Brand Context (All Tools Must Use)

Before generating any asset, apply these design tokens from the Edge design system:

- **Background**: `#0A0B0E` (Deep Dark)
- **Surface**: `#12131A` (Dark Gray)
- **Border**: `#1E2030` (Subtle Gray)
- **Accent**: `#00FF88` (Electric Green) — use sparingly, CTAs and highlights only
- **Text Primary**: `#E8E9ED` (Near White)
- **Text Secondary**: `#8B8FA3` (Cool Gray)
- **Display Font**: Space Grotesk (Bold 700)
- **Body Font**: DM Sans (Regular 400)
- **Aesthetic**: Minimalist & Refined (Dark Finance) — Bloomberg-inspired, not consumer app

## Production Instructions by Tool

### LogoLoom — Brand Identity (Assets 1.1, 1.2, 1.3)

1. Call `text_to_path` with the logo SVG using Space Grotesk font
2. Call `optimize_svg` to clean and compress
3. Call `export_brand_kit` to generate all 31 files (SVG variants, PNG sizes, ICO, OG image, BRAND.md)
4. Save output to `public/brand/` directory

Logo design spec: "Edge" wordmark in Space Grotesk Bold. The "E" has a subtle Electric Green accent — either a small signal icon mark or a green stroke on one serif. Dark background variants must use `#0A0B0E`. Light/mono variants for contrast situations.

### QuiverAI — Custom Icons (Assets 3.1–3.6)

1. Call `list_models` to find available SVG generation models
2. For each icon, call `create_generation` with:
   - Text prompt describing the icon concept
   - Style: "minimal geometric, dark finance aesthetic, single accent color (#00FF88), no fills, stroke-based, consistent line weight"
3. Poll `get_task` until generation completes
4. Call `get_creation_content` to retrieve SVG source
5. Save to `public/icons/` with descriptive filenames

Icon style guide: Each icon uses Electric Green accent gradient on key elements, dark surface-compatible colors, and consistent 24×24 viewBox. NOT generic line icons — must feel custom and on-brand.

**Icon prompts:**

| Asset | Prompt |
|-------|--------|
| 3.1 Chart-Only Limitation | "Icon showing a partial bar chart with only the left half visible, the right half fades out — representing incomplete information. Green accent on the visible bars." |
| 3.2 Fragmented Research | "Icon showing 3–4 small disconnected windows/tabs scattered apart with subtle gaps between them. Green accent on one tab." |
| 3.3 Information Asymmetry | "Icon showing two monitors: one filled with data lines, one nearly empty. Green accent on the full monitor." |
| 3.4 Unified Workspace | "Icon showing multiple panes merging into one — layers combining. Green accent on the merge point." |
| 3.5 Interactive AI | "Icon showing a chat bubble with a small signal/wave inside, suggesting contextual AI. Green accent on the signal." |
| 3.6 Real-Time Context | "Icon showing a radar/pulse with concentric rings emanating outward, suggesting live data signals. Green accent on the pulse." |

### Dashmotion — Animated Flow Diagrams (Assets 2.2, 2.3, 4.8)

Read and follow the Dashmotion skill (`dashmotion/SKILL.md`) for generating self-contained animated HTML/SVG flow diagrams.

**Asset 4.8 — Data Flow (Signature Moment):**
Describe a 3-node flow: Chart → Edge → Research/AI. Traveling green dots (#00FF88) move along connector paths between nodes. Dark background (#0A0B0E). Node fill: #12131A. Border: #1E2030. This is the page's primary visual differentiator.

**Asset 2.3 — How It Works Steps:**
3-step horizontal flow: "See the Setup" → "Ask the Question" → "Get the Full Picture". Numbered nodes with connecting paths. Same color scheme.

### Superdesign — Product Mockup (Asset 2.1)

1. Open https://app.superdesign.dev/ai-mockup-generator or use the Cursor skill
2. Generate with prompt: "Dark finance trading dashboard with chart on the left and an AI research panel on the right. Deep dark background (#0A0B0E), Electric Green (#00FF88) accents. Bloomberg-terminal aesthetic. Professional, data-dense but controlled."
3. Export the mockup
4. In the landing page code, wrap in a dark device frame with CSS: subtle green glow underneath (radial gradient at 5-10% opacity), slight 3D tilt via `transform: perspective(1000px) rotateY(-5deg)`, and drop shadow

## Code-Only Assets (No External Tool)

These are built directly in the Next.js project during implementation:

| Assets | Implementation |
|--------|---------------|
| 3.7 FAQ chevron | SVG + CSS rotation animation |
| 3.8 Social icons | `lucide-react` package |
| 4.1 Green glow pulse | CSS `@keyframes pulse-glow` |
| 4.2 Grid pattern background | CSS `background-image: repeating-linear-gradient(...)` |
| 4.3 Noise/grain overlay | CSS `filter: url(#noise)` with SVG filter |
| 4.4 Logo accent glow | CSS `text-shadow` animation |
| 4.5 Count-up numbers | `CountUp` React component (Intersection Observer) |
| 4.6 Staggered text reveals | CSS `animation-delay` on span elements |
| 4.7 Scroll-triggered fade-ins | Intersection Observer + CSS transitions |
| 4.9 Chart background | CSS animated gradient or minimal Canvas |
| 4.10 3D tilt | JS `mousemove` + CSS `perspective` + `transform` |
| 4.11 Particles | `tsParticles` library (tree-shakeable import) |
| 4.12 Cinematic scroll reveals | Framer Motion `whileInView` |
| 4.13 Typewriter effect | JS `setInterval` character append |
| 5.1–5.3 Third-party logos | `simple-icons` npm package |

## File Locations

Generated assets should be saved to:

```
public/
├── brand/           # Logo, favicon, OG image (from LogoLoom)
├── icons/           # Custom SVG icons (from QuiverAI)
├── mockups/         # Product mockup images (from Superdesign)
└── animations/      # Lottie/SVG animations (from Dashmotion)
```
