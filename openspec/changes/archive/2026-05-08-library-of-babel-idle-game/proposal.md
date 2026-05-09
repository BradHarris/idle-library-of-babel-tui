## Why

Inspired by Jorge Luis Borges' "The Library of Babel" — the story of an infinite library containing every possible 280-character page — this is a terminal-based idle/incremental game. The player manages an ever-growing press that deterministically generates pages from the combinatorial space of 43 possible characters. Workers produce pages, managers auto-hire workers, and the chain cascades upward through a church-like hierarchy. The game is a quick prototype to explore the core loop before deciding on further polish or multi-language experimentation.

## What Changes

- A Node.js TUI idle game rendered with **ink** (React for terminal)
- Deterministic page generation: each page number maps to a unique, reproducible 280-character string from a 43-character set (a-z, ., ,, !, ?, (, ), 0-9, space)
- Seven worker tiers that produce pages and auto-hire the tier below: Writer → Manager → Overseer → Rector → Cardinal → Pope → Archbishop
- Compounding economy: pages earn money, money buys workers, more workers produce more pages
- Wrap-around display of the latest generated page in a tidy terminal block
- Number formatting (raw → K/M/B/T → scientific notation) for astronomically large page counts

## Capabilities

### New Capabilities

- `page-generation`: Deterministic generation of 280-character pages from a page number using a seeded PRNG and a 43-character alphabet
- `idle-economy`: Seven-tier worker system with compounding auto-hire chains, price scaling, and per-page earnings
- `tui-display`: Real-time terminal dashboard showing stats, latest page (wrapped), worker tiers, and event log

### Modified Capabilities

<!-- None — this is a greenfield project -->

## Impact

- New project with `package.json`, `src/` directory, and Node.js dependencies (ink, react, chalk)
- No existing code or dependencies to migrate
- Save/load system deferred to post-prototype
