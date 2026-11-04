## ADDED Requirements

### Requirement: Formatting applies to the web dashboard

All formatting requirements in this capability SHALL apply to numeric and textual values rendered in `web/src/components/` (and any successor web panel paths). The web UI is the authoritative interactive display surface for the game.

#### Scenario: Web StatsPanel uses formatters

- **WHEN** money, page counts, or pages/sec are shown in the web Stats panel
- **THEN** they use `formatMoney`, `formatPageNumber`, and `formatNumber` as specified in the existing requirements of this spec

#### Scenario: Web WorkersPanel uses formatters

- **WHEN** worker counts are shown in the web Workers panel
- **THEN** they use `formatNumber` as specified in the existing requirements of this spec
