## 1. Project Setup

- [x] 1.1 Initialize package.json with Node.js project metadata and dependencies (react, ink, chalk)
- [x] 1.2 Create directory structure: src/ (index.js, game.js, page.js, format.js, ui.js, config.js)
- [x] 1.3 Create config.js with worker tier definitions (7 tiers, base costs, auto-hire targets)
- [x] 1.4 Create package.json scripts: "start", "dev" (if using nodemon or similar)

## 2. Core Game State

- [x] 2.1 Define GameState type/interface: pagesGenerated (BigInt), currentPage (BigInt), money (Number), workers (object per tier), log (array), lastTick (timestamp)
- [x] 2.2 Implement game initialization: start with 1 Writer, $0 money, 0 pages
- [x] 2.3 Implement pagesPerSecond calculation: sum of all worker counts across tiers
- [x] 2.4 Implement worker cost calculation: baseCost × 1.5^count for each tier

## 3. Page Generation

- [x] 3.1 Define the 43-character alphabet constant in page.js
- [x] 3.2 Implement PRNG seed derivation: SHA-256 hash of page number string, truncated to 32-bit unsigned int
- [x] 3.3 Implement Mulberry32 PRNG function (single-line seeded PRNG)
- [x] 3.4 Implement page generation: for each of 280 positions, generate random index (prng() % 43), map to character
- [x] 3.5 Verify determinism: same page number always produces same output
- [x] 3.6 Verify output: exactly 280 characters, all from defined alphabet
- [x] 3.7 Handle BigInt page numbers: convert to string for hashing

## 4. Number Formatting

- [x] 4.1 Implement formatNumber: raw display for values 0-9,999
- [x] 4.2 Implement K/M/B/T suffix formatting for 10K-999.9T range
- [x] 4.3 Implement scientific notation for values above 999.9T
- [x] 4.4 Implement formatMoney: prefix with $, apply formatNumber rules
- [x] 4.5 Implement formatPageNumber: comma-separated thousands for large BigInt values
- [x] 4.6 Implement formatPagesPerSecond: 2 decimal places
- [x] 4.7 Write unit tests for all formatting functions with edge cases

## 5. Page Wrapping

- [x] 5.1 Implement wrapText: split a string into lines of given width at character boundaries
- [x] 5.2 Handle edge case: page shorter than display width (no wrapping needed)
- [x] 5.3 Handle edge case: page longer than display width (multiple lines)

## 6. Game Tick Loop

- [x] 6.1 Implement tick function: runs at 50ms interval
- [x] 6.2 In each tick, calculate pagesThisTick = pagesPerSecond × (tickInterval / 1000)
- [x] 6.3 Increment pagesGenerated (BigInt addition) by pagesThisTick
- [x] 6.4 Increment currentPage by pagesThisTick
- [x] 6.5 Add pagesThisTick × $1.00 to money
- [x] 6.6 Generate and cache the latest page string (using currentPage)
- [x] 6.7 Check auto-hire timers for each non-Writer tier (30s intervals)
- [x] 6.8 On auto-hire trigger: if sufficient funds, deduct cost, increment worker count, log event
- [x] 6.9 Log page generation event every tick (or every Nth tick to reduce noise)

## 7. TUI Rendering — Stats Panel

- [x] 7.1 Create StatsPanel React component (ink Text components)
- [x] 7.2 Display total pages generated (formatted with formatNumber/formatPageNumber)
- [x] 7.3 Display current money (formatted with formatMoney)
- [x] 7.4 Display pages per second (formatted with 2 decimal places)
- [x] 7.5 Apply simple visual styling (chalk colors for headings vs values)

## 8. TUI Rendering — Latest Page Panel

- [x] 8.1 Create LatestPagePanel React component
- [x] 8.2 Display page number header with formatted number and commas
- [x] 8.3 Display wrapped page content (wrapText into display-width lines)
- [x] 8.4 Show content in a bordered/bracketed visual block
- [x] 8.5 Apply monospace styling for the page content

## 9. TUI Rendering — Workers Panel

- [x] 9.1 Create WorkersPanel React component
- [x] 9.2 For each of 7 tiers, display: tier name, worker count, current cost, [Hire] button
- [x] 9.3 Show current cost formatted as money
- [x] 9.4 Disable [Hire] button visually when player has insufficient funds
- [x] 9.5 Handle [Hire] click: attempt purchase, deduct money, increment worker count, log event
- [x] 9.6 Add visual progress indicators (bar or similar) showing relative tier progression

## 10. TUI Rendering — Log Panel

- [x] 10.1 Create LogPanel React component
- [x] 10.2 Display last N events (e.g., 10) with timestamps
- [x] 10.3 Newest events at top, oldest at bottom
- [x] 10.4 Format: "[HH:MM:SS] event description"
- [x] 10.5 Implement log cleanup: remove oldest entries when count exceeds maximum

## 11. TUI Layout & Integration

- [x] 11.1 Create main App component that arranges all four panels in a grid layout
- [x] 11.2 Layout: Stats on top, Latest Page below it, Workers and Log side by side
- [x] 11.3 Integrate with ink's <Flex> and <Box> for panel arrangement
- [x] 11.4 Add title bar: "THE LIBRARY OF BABEL" at top
- [x] 11.5 Handle terminal resize events (recalculate wrap width)
- [x] 11.6 Ensure all state changes trigger re-render via React state

## 12. Game Loop Integration

- [x] 12.1 Integrate tick loop with React state updates (use useEffect or interval in App)
- [x] 12.2 Separate logic tick (50ms) from render interval (100ms)
- [x] 12.3 Use React state (useState/useRef) to pass game state to UI components
- [x] 12.4 Ensure tick continues during re-renders (use useRef for timer handle)
- [x] 12.5 Handle graceful exit (cleanup intervals on unmount)

## 13. Testing & Polish

- [x] 13.1 Test page generation with known page numbers (verify determinism)
- [x] 13.2 Test number formatting across all ranges (raw, K, M, B, T, scientific)
- [x] 13.3 Test worker purchase flow: can't afford → can afford → purchase → cost increases
- [x] 13.4 Test auto-hire chain: hire Manager → auto-hire Writer → more pages
- [x] 13.5 Test with extreme values: simulate high pages/sec, verify BigInt doesn't break
- [x] 13.6 Visual polish: color coding (green for money, blue for pages, etc.)
- [x] 13.7 Quick-play test: run for 5 minutes, verify game is engaging and bug-free
