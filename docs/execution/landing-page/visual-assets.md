# Edge Landing Page — Visual Assets Inventory

> Comprehensive inventory of every visual asset the Edge landing page requires, with priority, complexity, and production approach.

## Status Key

- **Code-only**: Can be produced entirely in CSS/SVG/JS during build — no separate design file needed
- **Design-needed**: Requires a designer or specialized tool to produce a standalone asset
- **Hybrid**: Code handles the base behavior; a design asset enhances it

---

## 1. Brand Identity Assets

| # | Asset | Description | Priority | Complexity | Approach |
|---|-------|-------------|----------|------------|----------|
| 1.1 | **Logo / Wordmark** | "Edge" in Space Grotesk Bold with green accent on the "E" or a small signal icon mark | Required | Medium | **Hybrid** — Text treatment works for V1; proper SVG logo with accent detail needs design export |
| 1.2 | **Favicon** | Simplified logo mark (likely the "E" with green accent) at 32x32 and 16x16 | Required | Low | **Design-needed** — PNG/ICO export from logo design |
| 1.3 | **Open Graph Image** | 1200×630 social share card — dark background, logo, headline, maybe product frame | Medium | Medium | **Design-needed** — Composited image for Twitter/LinkedIn/link previews |

---

## 2. Product Visuals (Highest Impact)

| # | Asset | Description | Priority | Complexity | Approach |
|---|-------|-------------|----------|------------|----------|
| 2.1 | **Hero Product Mockup** | Dark browser/device frame showing Edge UI: chart on left, AI research panel on right, green glow underneath, slight 3D tilt + shadow | Required | High | **Design-needed** — Requires screenshot of actual product or Figma mockup. This is the single highest-impact visual asset on the page |
| 2.2 | **Solution Section Diagram** | Visual showing unified experience — chart + research + AI connected. Could be a static mockup or animated data-flow visual | High | High | **Design-needed** — Could be an animated SVG showing data flowing between panels |
| 2.3 | **How It Works Step Visuals** | 3-step numbered flow with connecting visual between steps — animated line, data flow, or progression graphic | Medium | Medium-High | **Hybrid** — Simple connecting lines in SVG/CSS; something more compelling (animated data flow) needs design |

---

## 3. Icons

All icons should follow the design system: custom green-accent gradient, NOT generic line icons.

| # | Asset | Description | Complexity | Approach |
|---|-------|-------------|------------|----------|
| 3.1 | **Pain Point: Chart-Only Limitation** | Represents "half the picture" — partial chart, fragmented screen, or eye seeing only part of data | Medium | **Code-only** — Inline SVG with green accent gradient |
| 3.2 | **Pain Point: Fragmented Research** | Multiple scattered tabs/windows, disconnected pieces | Medium | **Code-only** — Inline SVG with green accent gradient |
| 3.3 | **Pain Point: Information Asymmetry** | Two screens — one full, one empty — representing the tool gap | Medium | **Code-only** — Inline SVG with green accent gradient |
| 3.4 | **Feature: Unified Workspace** | Chart + research icon — layers merging, panes combining | Medium | **Code-only** — Inline SVG with green accent gradient |
| 3.5 | **Feature: Interactive AI** | AI/chat icon — brain, chat bubble with signal, context-aware symbol | Medium | **Code-only** — Inline SVG with green accent gradient |
| 3.6 | **Feature: Real-Time Context** | Signal/radar icon — pulse, antenna, data stream | Medium | **Code-only** — Inline SVG with green accent gradient |
| 3.7 | **FAQ Chevron / Accordion Icon** | Custom chevron or plus/minus for expand/collapse with rotation animation | Low | **Code-only** — SVG + CSS rotation |
| 3.8 | **Social Icons** (Footer) | Twitter/X and Discord icons | Low | **Code-only** — Available from Lucide/Simple Icons |

---

## 4. Complex / Motion Assets

These go beyond standard CSS animations and are the primary differentiators between a "good" landing page and a "memorable" one.

### 4A. Animations Code Can Handle

| # | Asset | Description | Complexity | Approach |
|---|-------|-------------|------------|----------|
| 4.1 | **Green Glow Pulse (CTA)** | Radial gradient that breathes/pulses behind primary CTA button | Low | **Code-only** — CSS `pulse-glow` keyframe (already in skill) |
| 4.2 | **Grid Pattern Background** | Subtle grid at 2–3% opacity evoking charting software | Low | **Code-only** — CSS repeating linear gradients or SVG pattern |
| 4.3 | **Noise/Grain Texture Overlay** | Film grain texture over dark background for depth | Low | **Code-only** — CSS with small noise PNG tile or SVG filter |
| 4.4 | **Logo Accent Glow** | Green accent on "E" that glows on page load | Low | **Code-only** — CSS animation with text-shadow |
| 4.5 | **Count-Up Number Animations** | Stats counting from 0 → final value on scroll (1,000+ traders, 5 hours, 6 layers) | Low-Medium | **Code-only** — `CountUp` component (already in skill) |
| 4.6 | **Staggered Text Reveals** | Headlines, subheads, and body copy fade up with staggered timing | Low | **Code-only** — CSS animations with `animation-delay` |
| 4.7 | **Scroll-Triggered Fade-Ins** | Sections animate in as they enter viewport | Low | **Code-only** — Intersection Observer + CSS transitions |

### 4B. Animations Needing Specialized Work

| # | Asset | Description | Complexity | Approach | Impact |
|---|-------|-------------|------------|----------|--------|
| 4.8 | **Animated Data Flow / Connection Visual** | The "signature moment" — data flowing FROM chart TO research TO AI. Animated SVG paths with particles traveling along them, or glowing lines that trace between UI panels | High | **Design-needed** — Animated SVG with JS is possible but time-consuming. Lottie animation or After Effects export would be more polished | Highest — this is the page's "wow" factor |
| 4.9 | **Charting Background Animation** | Subtle live-looking chart lines or candlesticks drifting across background at very low opacity, reinforcing trading context | Medium | **Hybrid** — Canvas/CSS animation doable but needs careful execution to stay subtle | Medium — atmospheric, not focal |
| 4.10 | **3D Tilt on Product Mockup** | Subtle parallax tilt on product frame as user moves mouse | Medium | **Hybrid** — JS mousemove handler + CSS transform perspective. The product mockup image itself needs design, but the tilt interaction is code | High — makes the hero feel premium |
| 4.11 | **Particle / Signal Effect** | Small green particles or signal dots emanating from key UI elements, suggesting "data in motion" | High | **Design-needed** — Canvas or tsParticles library — feasible but adds bundle weight | Medium-High — adds energy but must stay subtle |
| 4.12 | **Cinematic Scroll Reveals** | Sections that don't just fade in but have more dramatic reveals — product mockup slides from right while text slides from left, parallax depth layers | Medium | **Hybrid** — Framer Motion handles the logic, but the design language for each reveal needs planning | Medium — elevates polish |
| 4.13 | **Typewriter / Terminal Effect** | Text appearing character by character like a Bloomberg terminal, used in the AI section or hero subtext | Medium | **Hybrid** — JS animation doable; fits the Bloomberg aesthetic perfectly | Medium-High — reinforces the trading/AI identity |

---

## 5. Third-Party Logos

| # | Asset | Source | Notes |
|---|-------|--------|-------|
| 5.1 | TradingView logo | Simple Icons or brand asset page | Grayscale/desaturated for dark background |
| 5.2 | Bloomberg logo | Simple Icons | Same treatment |
| 5.3 | Seeking Alpha logo | Simple Icons | Same treatment |

---

## 6. Summary: Production Plan

### V1 (Minimum Viable — Ship Quickly)

Everything marked **Code-only** plus:

- [ ] 1.1 Logo as text with Space Grotesk Bold (no accent file yet)
- [ ] 2.1 Hero product mockup — use a Figma screenshot in a dark device frame with green glow
- [ ] 4.1–4.7 All code-based animations
- [ ] 5.1–5.3 Third-party logos from Simple Icons

### V2 (Polish & Differentiation)

Add everything marked **Design-needed** or **Hybrid**:

- [ ] 1.1 Proper SVG logo with green accent
- [ ] 1.2 Favicon
- [ ] 1.3 OG image
- [ ] 2.1 Real product screenshot with 3D tilt (4.10)
- [ ] 2.2 Animated solution diagram / data flow (4.8)
- [ ] 4.8 Signature data-flow animation
- [ ] 4.9 Charting background animation
- [ ] 4.11 Particle/signal effects
- [ ] 4.12 Cinematic scroll reveals
- [ ] 4.13 Typewriter/terminal effect

---

## 7. AI Tools for Asset Production

### Logo, Icons & Brand Kit

| Tool | Type | What It Produces | MCP-Native? | Cost | Best For |
|------|------|------------------|-------------|------|----------|
| **[LogoLoom](https://github.com/mcpware/logoloom)** | CLI + MCP | Full brand kit: SVG logo (icon + wordmark + variants), PNG sizes (16px–1024px), ICO favicon, WebP, OG image (1200×630), BRAND.md | Yes | Free, local | Assets 1.1, 1.2, 1.3 — generates everything from one SVG. Reads your codebase to understand brand. Best single tool for the brand identity set |
| **[Brandkit](https://github.com/Gent8/brandkit)** | CLI + MCP | One source SVG → 14 ship-ready files (favicon, OG image, PWA icons, Chrome Web Store). Palette-locked to `brand.json`. CI gate for color drift | Yes | Free (bring your own Recraft/fal.ai key) | Assets 1.1, 1.2, 1.3 — strongest for palette enforcement and CI integration. `brandkit verify` catches off-brand colors |
| **[Inkpilot](https://inkpilot.dev/)** | VS Code extension + MCP | Interactive SVG editor with 14 tools. Built-in design prompts for logo, icon, badge, banner, graphic. Live preview, iterate by conversation | Yes | Free | Assets 3.1–3.8 — best for custom icons. Can see what it's generating and iterate in real time |
| **[Iconly](https://iconly.ai/)** | Web platform + API | AI icon generation (20+ styles), vector studio with node editing, social graphics, email templates, brand studio | No (has API + agent skill file) | Freemium | Assets 3.1–3.6, 1.3 — good for batch-generating consistent icon sets. Has a downloadable agent skill file for Cursor |
| **[QuiverAI](https://quiver.ai/)** | Hosted MCP server | Text-to-SVG generation, raster-to-SVG vectorization, SVG animation. Arrow family of models. Cursor plugin available | Yes | Freemium | Assets 1.1, 3.1–3.8 — strongest MCP-native SVG generation. Can generate AND animate SVGs in one workflow |
| **[Prompt-to-Asset](https://github.com/MohamedAbdallah-14/prompt-to-asset)** | CLI + MCP | Logos, app icons, favicons, OG images, splash screens, SVG. Routes across 60+ models. Zero-key free routes available. Platform fan-out (iOS, Android, PWA) | Yes | Free (zero-key routes) | Assets 1.1–1.3 — best model coverage with free routing. `inline_svg` mode lets the LLM author SVG directly with no API key |

### Motion & Animation

| Tool | Type | What It Produces | MCP-Native? | Cost | Best For |
|------|------|------------------|-------------|------|----------|
| **[Lottie Creator](https://lottiefiles.com/lottie-creator)** | Web editor | Professional Lottie animations. AI-powered: Motion Copilot (keyframes from text), Prompt to Vector, Prompt to State Machines, AI theming. Exports dotLottie | No | Free | Assets 4.8, 4.12 — best for the signature data-flow animation and cinematic reveals. State machines enable interactive animations (hover, click) |
| **[OmniLottie](https://omnilottie.com/)** | Web platform + API | AI Lottie generation, editing, and animation. Layer-aware workflow. Handoff-ready JSON | No (has API) | Paid | Asset 4.8 — alternative to Lottie Creator. Foundational models tuned for Lottie generation |
| **[LottieForge](https://lottieforge.com/)** | Web tool | AI Lottie generator for icons, loaders, micro-interactions. Simple prompts → production JSON | No | Credit-based (5 credits/gen) | Assets 4.1, 4.5, 4.7 — best for quick micro-animations (pulse, spin, checkmarks) |
| **[Allyson MCP](https://github.com/iflow-mcp/isaiahbjork-allyson-mcp)** | MCP server | Transforms static SVGs into animated React components. Takes a source SVG + animation prompt → outputs animated TSX | Yes | Bring your own API key | Assets 4.4, 4.8, 4.13 — best for animating existing SVGs (like the logo glow or data-flow diagram). Outputs React components directly |
| **[Dashmotion](https://github.com/rpatel1303/dashmotion)** | Claude skill | Generates animated flowcharts and architecture diagrams as self-contained HTML/SVG. Traveling light dots on connector paths. No libraries, no dependencies | Yes (Claude skill) | Free | Asset 4.8 — specifically designed for data-flow diagrams with animated request paths. Perfect for the "chart → research → AI" connection visual |
| **[QuiverAI](https://quiver.ai/)** (animation mode) | Hosted MCP server | `create_animation` tool — takes an existing SVG and animates it. Poll task, retrieve animated result | Yes | Freemium | Assets 4.8, 4.4 — can generate a static SVG first, then animate it in a second step |

### Product Mockups & Hero Images

| Tool | Type | What It Produces | MCP-Native? | Cost | Best For |
|------|------|------------------|-------------|------|----------|
| **[Superdesign](https://app.superdesign.dev/ai-mockup-generator)** | Web tool + Cursor skill | AI mockup generator → high-fidelity, editable UI screens. Real layout, typography, components. Infinite canvas with branching | Yes (Cursor skill) | Free tier (3/month) | Asset 2.1 — generate a realistic product mockup from a text description. Has a Cursor skill for agent-driven generation |
| **[Screenhance](https://screenhance.com/landing-page-mockup-generator)** | Web tool | Turns screenshots into polished mockups. 40+ device frames, gradient backgrounds, animated exports. Landing page hero specialist | No | Freemium | Asset 2.1 — best for wrapping an existing product screenshot in a professional device frame with green glow. Also exports animated loops |
| **[Figma Make](https://www.figma.com/solutions/mockup-generator/)** | Figma AI | Prompt → interactive prototypes using existing design system. Can generate on-brand mockups from design tokens | No | Included in Figma | Asset 2.1 — if you have an Edge Figma project, Make can generate mockups using your actual design system |
| **[Trickle Hero Builder](https://trickle.so/tools/ai-generated-hero-image-page-builder)** | Web tool | AI hero image generation with brand color input. Prompt-to-layout. Responsive sets (desktop, tablet, mobile) + retina | No | Freemium | Asset 2.1 — quick hero image generation. Accepts hex codes for brand consistency |

### Particle Effects & Background Animation

| Tool | Type | What It Produces | MCP-Native? | Cost | Best For |
|------|------|------------------|-------------|------|----------|
| **[tsParticles](https://particles.js.org/)** | JS library | Configurable particle effects: connections, emitters, absorbers. Lightweight, tree-shakeable | N/A (code library) | Free | Assets 4.9, 4.11 — the standard for web particle effects. Can create subtle green signal dots, chart-line backgrounds, connection particles |
| **[Dashmotion](https://github.com/rpatel1303/dashmotion)** | Claude skill | Animated flow diagrams with traveling light dots on SVG paths | Yes | Free | Asset 4.8 — data-flow animation specifically |
| **Custom Canvas + CSS** | Code | Chart-line drift, noise grain, grid pattern, green glow — all achievable with CSS animations and minimal Canvas | N/A | Free | Assets 4.2, 4.3, 4.6, 4.9 — the skill already provides CSS patterns for most of these |

---

## 8. Recommended Production Workflow

### Phase 1: Brand Identity (Day 1)

1. Install **LogoLoom** or **Brandkit** as MCP server
2. Generate logo SVG with Edge's design tokens (`#00FF88`, Space Grotesk, dark palette)
3. Export full brand kit: favicon, OG image, all PNG sizes
4. Result: Assets 1.1, 1.2, 1.3 done

### Phase 2: Icons (Day 1)

1. Install **Inkpilot** or **QuiverAI** as MCP server in Cursor
2. Generate 6 custom icons (3 pain points + 3 features) with green accent gradient style
3. Iterate in real time using conversation-based refinement
4. Result: Assets 3.1–3.6 done

### Phase 3: Product Mockup (Day 2)

1. Use **Superdesign** (via Cursor skill) to generate a dark-finance product UI mockup from text description
2. Feed the mockup through **Screenhance** for device frame + green glow + 3D perspective
3. Result: Asset 2.1 done

### Phase 4: Signature Animation (Day 2–3)

1. Use **Dashmotion** skill to generate the animated data-flow diagram (chart → research → AI)
2. Alternatively, generate a static SVG with **QuiverAI**, then animate it with `create_animation`
3. For particle effects, integrate **tsParticles** library for green signal dots
4. Result: Assets 4.8, 4.11 done

### Phase 5: Micro-Animations (Day 3)

1. Use **Allyson MCP** to animate the logo SVG (glow on accent)
2. Use **LottieForge** or **Lottie Creator** for loader/spinner/checkmark micro-animations if needed
3. Code-based animations (4.1–4.7) ship with the landing page build
4. Result: All remaining assets done

---

## 9. Setup & Configuration

### What's Already Configured

The following are set up in the project and ready to use:

**MCP Servers** (`.cursor/mcp.json`):
- **LogoLoom** — `npx logoloom` (local, free)
- **QuiverAI** — `https://app.quiver.ai/mcp` (hosted, requires OAuth on first use)

**Project Skills** (`.cursor/skills/`):
- **visual-assets** — Asset inventory, brand context, icon prompts, tool-to-asset mapping
- **visual-production** — Orchestrated production workflow (phase order, verification)
- **dashmotion** — Animated data-flow diagram generation with Edge color overrides

**Project Rule** (`.cursor/rules/visual-assets.mdc`):
- Always-applied rule that tells the agent which tools exist, when to use which, and the brand design tokens

### First-Time Setup Steps

1. **LogoLoom**: Already in `mcp.json`. Run `npx logoloom` once to install the package. The MCP server will auto-start when Cursor connects.

2. **QuiverAI**: Already in `mcp.json`. On first use in Cursor, you'll be prompted to sign in via OAuth. After that, it works without API keys.

3. **Dashmotion**: Already saved in `.cursor/skills/dashmotion/`. No install needed — it's a skill file the agent reads.

4. **Superdesign**: No MCP server. Open https://app.superdesign.dev/ai-mockup-generator in a browser when you need to generate the product mockup. Alternatively, install the Superdesign Cursor skill from their website for agent-driven generation.

### How the Agent Knows What to Do

Three mechanisms ensure the LLM uses the right tool in the right context:

1. **Always-applied rule** (`visual-assets.mdc`): Injected into every conversation. The agent always knows which MCP servers and skills are available, which asset maps to which tool, and the brand design tokens.

2. **Skills with specific descriptions**: Each skill's `description` field contains trigger terms. When you say "generate the logo" or "create the data flow animation", the agent matches to the correct skill.

3. **Orchestrator skill** (`visual-production`): Enforces the correct production order. When starting visual asset work, the agent reads this skill and follows the phased workflow.

### Optional Additional Tools

These were researched but not configured by default. Add them if needed:

| Tool | Why You'd Add It | Install |
|------|-----------------|---------|
| **Brandkit** | CI palette enforcement — `brandkit verify` catches off-brand colors in CI | `docker build -t brandkit-mcp:latest` from https://github.com/Gent8/brandkit |
| **Inkpilot** | Live SVG preview editor for real-time icon iteration | Install from VS Code Marketplace |
| **Allyson MCP** | Animate static SVGs into React components | `npm install -g allyson-mcp` |
| **Prompt-to-Asset** | Alternative to LogoLoom with 60+ model routing and zero-key free routes | `npx prompt-to-asset` |
