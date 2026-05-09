## ADDED Requirements

### Requirement: Game logic tests use Node built-in test runner
The system SHALL include a test file at `src/game.test.js` using Node's built-in test runner (`node --test`). Tests SHALL use the standard `describe`, `it`, and `strictEqual` assertions from the Node test runner.

#### Scenario: Tests execute via Node runner
- **WHEN** `node --test src/game.test.js` is run
- **THEN** all tests pass and report a summary

#### Scenario: Tests are deterministic
- **WHEN** tests are run multiple times
- **THEN** results are identical (no randomness, no time-dependent assertions)

### Requirement: Tick tests verify deterministic output
Tests SHALL verify that `tick(deltaMs)` produces correct results for known inputs without relying on real time. Tests SHALL use zero-delta ticks for state-transition verification and non-zero delta ticks for production calculation verification.

#### Scenario: Zero-delta tick only applies cascade
- **WHEN** a state with {writer:1, overseer:1} calls `tick(0)`
- **THEN** worker counts reflect the cascade (writer:2, manager:1, overseer:1) and all other state is unchanged

#### Scenario: Tick with 1-second delta and 1 writer
- **WHEN** a state with 1 writer and $0 calls `tick(1000)`
- **THEN** money is $1.00, pages generated is 1n, current page is 1n, fractional pages is 0

#### Scenario: Tick with 0.5-second delta and 2 writers
- **WHEN** a state with 2 writers and $100 calls `tick(500)`
- **THEN** money is $101.00, pages generated is 1n, fractional pages is 0.0

### Requirement: Worker cost tests verify exponential scaling
Tests SHALL verify that `getWorkerCost(tier, count)` returns `baseCost × 1.5^count` for all tiers.

#### Scenario: First worker costs base price
- **WHEN** count is 0
- **THEN** cost equals tier baseCost

#### Scenario: Second worker costs 1.5× base
- **WHEN** count is 1
- **THEN** cost equals `baseCost × 1.5`

#### Scenario: Third worker costs 2.25× base
- **WHEN** count is 2
- **THEN** cost equals `baseCost × 2.25`

#### Scenario: All tiers follow the same scaling
- **WHEN** cost is calculated for all 7 tiers at count = 3
- **THEN** each equals `baseCost × 3.375` (1.5^3)

### Requirement: Purchase tests verify state transitions
Tests SHALL verify that `purchaseWorker` and `purchaseTickRateUpgrade` produce correct state changes for both success and failure cases.

#### Scenario: Successful purchase deducts correct amount
- **WHEN** a state with $1000 and 0 managers calls `purchaseWorker('manager')`
- **THEN** money becomes $500, manager count becomes 1

#### Scenario: Failed purchase changes nothing
- **WHEN** a state with $499 and 0 managers calls `purchaseWorker('manager')`
- **THEN** money, workers, and log are unchanged

#### Scenario: Purchase appends to log
- **WHEN** a worker is purchased
- **THEN** the log has one new entry with a valid timestamp and a message containing the worker name and cost

### Requirement: Format tests verify unified formatting
Tests SHALL verify that `formatNumber` and `formatMoney` produce correct output for edge cases including boundaries and large numbers. Tests SHALL cover the 1K threshold behavior.

#### Scenario: formatNumber at 999 boundary
- **WHEN** 999 is formatted
- **THEN** result is "999"

#### Scenario: formatNumber at 1000 boundary
- **WHEN** 1000 is formatted
- **THEN** result is "1.00K"

#### Scenario: formatMoney with large number
- **WHEN** $1500000 is formatted
- **THEN** result is "$1.50M"

#### Scenario: formatNumber with very large number
- **WHEN** 99999999999999999999 is formatted
- **THEN** result uses scientific notation

### Requirement: Cascade tests verify transitive worker spawning
Tests SHALL verify that the worker cascade correctly propagates through all 7 tiers in the Library of Babel. Tests SHALL use zero-delta ticks to isolate cascade logic from production logic.

#### Scenario: Single tier above writer
- **WHEN** {writer:1, manager:5, all others:0} and `tick(0)`
- **THEN** writer becomes 6 (1+5), manager stays 5

#### Scenario: Three tiers with workers
- **WHEN** {writer:1, manager:2, overseer:3, all others:0} and `tick(0)`
- **THEN** writer=6, manager=5, overseer=4

#### Scenario: All tiers populated
- **WHEN** {writer:1, manager:1, overseer:1, rector:1, cardinal:1, pope:1, archbishop:1} and `tick(0)`
- **THEN** writer=7, manager=6, overseer=5, rector=4, cardinal=3, pope=2, archbishop=1

#### Scenario: Cascading through gap (missing middle tier)
- **WHEN** {writer:1, manager:0, overseer:5, all others:0} and `tick(0)`
- **THEN** writer=6 (1+0+5), manager=5 (0+5), overseer=5
