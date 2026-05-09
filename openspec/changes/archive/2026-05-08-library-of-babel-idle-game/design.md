## Context

Greenfield Node.js project. No existing code. The project directory contains only the `openspec/` scaffolding. This is a prototype — speed of implementation matters more than architectural purity.

## Goals / Non-Goals

**Goals:**
- Deliver a playable idle game loop in a terminal: pages generate, money accumulates, workers are hired
- Show the latest generated page in a wrapped, readable block
- Demonstrate deterministic page generation (same page number always produces the same text)
- Support seven worker tiers with compounding auto-hire chains
- Use BigInt for page counts to handle the 10^444 scale
- Format numbers gracefully: raw → K/M/B/T → scientific notation

**Non-Goals:**
- Save/load system (deferred to post-prototype)
- Multi-language port (Node.js first; ports considered later)
- Meaningful/recognizable pages (all output is pseudo-random gibberish)
- Achievements, milestones, or progression beyond hiring
- Settings, customization, or accessibility features
- Sound, music, or visual effects beyond text color
- Mobile or cross-platform TUI support

## Decisions

### D1: TUI Framework — ink (React for terminal)

**Decision:** Use `ink` + `react` for terminal rendering.

**Rationale:** Declarative component model maps naturally to the dashboard layout (grid of panels that re-render on state change). React's diffing means we only re-render changed sections. Rich ecosystem (`ink-selectable`, `ink-text-table`). Mental model is simple: update state → screen updates.

**Alternatives considered:**
- `blessed` — older callback style, less ergonomic for dashboard layouts
- `blessed-contrib` — overly complex for what we need
- Custom `readline` loop — more control but reinvents everything

### D2: Page Number Representation — BigInt

**Decision:** Use native JavaScript `BigInt` for all page count arithmetic.

**Rationale:** 43^280 ≈ 10^447, which is ~447 digits. BigInt handles millions of digits natively in Node.js. Simple, exact arithmetic (no precision loss). Display formatting is a separate concern (convert to string, apply suffix logic).

**Alternatives considered:**
- Logarithmic representation — faster math but loses integer precision and complicates display
- Exponent + mantissa — custom arithmetic, error-prone, unnecessary given BigInt exists

### D3: Page Generation — Seeded PRNG

**Decision:** Hash the page number with SHA-256 to extract a 32-bit seed, then use Mulberry32 (or similar fast PRNG) to generate 280 random indices into the 43-character alphabet.

**Rationale:**
- SHA-256 ensures deterministic output: the same page number always produces the same page
- 43^280 requires ~1443 bits of randomness; 6× SHA-256 (32-bit seed expanded to 192 bits) provides more than enough
- Mulberry32 is fast (single-line implementation), well-distributed, and produces 32-bit outputs ideal for modulo-43 indexing

**Alternatives considered:**
- Direct base-48 encoding of the page number — simple but pages N and N+1 differ in only the last character (boring display)
- Counter-based hash stream (SHA-256(N||i) for i=0..5) — more work, same outcome

### D4: Worker Tier Structure — 7 Tiers, Church Hierarchy

**Decision:** Seven tiers with escalating costs and auto-hire chains:

| Tier | Base Cost | Auto-hires | Auto-hire Interval |
|------|-----------|------------|-------------------|
| Writer | $10 | — | — |
| Manager | $500 | 1 writer | 30s |
| Overseer | $5,000 | 1 manager | 30s |
| Rector | $50,000 | 1 overseer | 30s |
| Cardinal | $500,000 | 1 rector | 30s |
| Pope | $10,000,000 | 1 cardinal | 30s |
| Archbishop | $100,000,000 | 1 pope | 30s |

**Rationale:** The church hierarchy is thematic (Borges' library as a religious metaphor). Seven tiers provide enough progression for a prototype without overwhelming the player. Each tier auto-hires the tier below, creating a compounding cascade. 30-second intervals keep the game moving without overwhelming the player with notifications.

**Economy flow:**
```
Writers → +1 page/sec each → Pages → $1/page → Money
Manager → auto-hires writer → more writers → more pages
Overseer → auto-hires manager → more managers → more writers
... cascading up the chain
```

### D5: Price Scaling — ×1.5 Per Purchase

**Decision:** Each purchase of a worker multiplies its cost by 1.5.

**Rationale:** 1.5× is steeper than the standard idle game 1.15×, which compresses the number of purchases needed before the cost hits the next tier's range. This keeps the economy feeling challenging through the prototype while still allowing meaningful progression.

### D6: Earnings Model — $1 Per Page, Flat Rate

**Decision:** Every page generates exactly $1.00 regardless of total pages or other factors.

**Rationale:** Simple for the prototype. Money is a gate to hiring, not a competing scoring metric. The player's true goal is page count, not money. At 10^100 pages/sec, earning $10^100/sec is fine — money becomes scientific notation and the player stops reading exact values.

### D7: Tick Rates — 50ms Logic, 100ms Render

**Decision:**
- Game logic (page generation, earnings, auto-hire checks): 50ms interval
- TUI re-render: 100ms interval (10fps)
- Log cleanup: every 500 ticks (25s) to prevent unbounded growth

**Rationale:** 50ms logic gives 20 ticks/sec — smooth enough for high pps rates. 100ms render gives 10fps which is adequate for a text dashboard. Separating logic and render prevents unnecessary re-renders.

### D8: Character Set — 43 Characters

**Decision:** `abcdefghijklmnopqrstuvwxyz.,!()?0123456789 ` (no newline, no quotes, no brackets).

**Rationale:** All characters the user specified. 43 characters means ~5.43 bits per character. 280 characters × 5.43 bits ≈ 1520 bits of entropy per page, well within the ~192-bit output of our PRNG stream (6× SHA-256).

## Risks / Trade-offs

| Risk | Severity | Mitigation |
|------|----------|------------|
| BigInt performance at very high values | Low | 447 digits is trivial for BigInt; operations remain fast |
| UI becomes unresponsive at high page/sec | Medium | Separate logic thread? For prototype, 50ms tick is sufficient. Profile later. |
| Player boredom from static UI | Medium | The wrapped page display changes every tick — visual motion helps. Post-prototype polish. |
| Economy becomes too easy/hard | Low | Prototype numbers are guesses. Iteration after first playable build. |
| Auto-hire notifications spam the log | Low | Log cleanup every 25s keeps it bounded. |

## Migration Plan

N/A — greenfield project, no existing code to migrate.

## Open Questions

1. **Save system**: When and how to implement? Options: auto-save on exit, periodic save, manual save. Deferred for prototype.
2. **Auto-hire interval**: 30s chosen as default. Too fast? Too slow? Adjust after first playthrough.
3. **Earnings per page**: $1 flat rate chosen for simplicity. Might need diminishing returns at extreme page counts. Post-prototype consideration.
4. **Terminal width adaptation**: Should page wrapping be responsive to actual terminal width, or use a fixed width? Responsive is better UX but requires measurement.
