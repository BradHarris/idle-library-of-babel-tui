import React, { useState, useEffect, useCallback } from 'react';
import { render, Text, Box, useInput } from 'ink';
import chalk from 'chalk';
import { TIERS, getWorkerCost } from './config.js';
import { useGameStore } from './stores/gameStore.js';
import { StatsPanel, LatestPagePanel, WorkersPanel, LogPanel, StorageScalePanel, SearchOverlay } from './ui.jsx';
import { formatMoney, formatNumber } from './format.js';
import { queryToPageAddress, generatePage, stateToPage, ALPHABET } from './page.js';
import { locationFromPageOffset } from './storageScale.js';

/**
 * Main App component — arranges all four panels in a grid layout.
 */
export function App() {
  const [renderTick, setRenderTick] = useState(0);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [inputValue, setInputValue] = useState('');

  // Subscribe to store state via selectors
  const pagesGenerated = useGameStore(s => s.pagesGenerated);
  const currentPage = useGameStore(s => s.currentPage);
  const money = useGameStore(s => s.money);
  const playerWorkers = useGameStore(s => s.playerWorkers);
  const workers = useGameStore(s => s.workers);
  const log = useGameStore(s => s.log);
  const tickRateLevel = useGameStore(s => s.tickRateLevel);
  const tickRateCost = useGameStore(s => s.tickRateCost);
  const pps = useGameStore(s => s.pps);
  const canAfford = useGameStore(s => s.canAfford);
  const tickInterval = useGameStore(s => s.tickInterval);
  const latestPage = useGameStore(s => s.latestPage);
  const doublingMultipliers = useGameStore(s => s.doublingMultipliers);
  const doublingProgress = useGameStore(s => s.doublingProgress);

  // Force re-render at ~100ms for smooth UI updates
  useEffect(() => {
    const interval = setInterval(() => setRenderTick(t => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  // Terminal resize handler — triggers re-render on resize
  useEffect(() => {
    const handleResize = () => setRenderTick(t => t + 1);
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // Logic tick — runs at dynamic interval based on tick rate level
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().tick(tickInterval);
    }, tickInterval);
    return () => clearInterval(interval);
  }, [tickInterval]);

  // Handle worker hire
  const handleHire = useCallback((tierId) => {
    useGameStore.getState().hire(tierId);
  }, []);

  // Handle tick rate upgrade purchase
  const handleTickRateUpgrade = useCallback(() => {
    useGameStore.getState().upgradeTickRate();
  }, []);

  // Key input for hiring (keys 1-7), tick rate upgrade (u), and search
  useInput((input, key) => {
    if (searchOpen) {
      if (key.escape) {
        setSearchOpen(false);
        setSearchResult(null);
        setInputValue('');
        return true;
      }
      if (key.backspace) {
        setInputValue(prev => prev.slice(0, -1));
        return true;
      }
      if (key.return) {
        handleSearch(inputValue);
        return true;
      }
      if (input.length === 1) {
        setInputValue(prev => prev + input);
        return true;
      }
      return false;
    }
    if (input === 'u') {
      handleTickRateUpgrade();
      return true;
    }
    if (input === 's') {
      setSearchOpen(true);
      setSearchQuery('');
      setSearchResult(null);
      setInputValue('');
      return true;
    }
    const keyMap = { '1': 'writer', '2': 'manager', '3': 'overseer', '4': 'rector', '5': 'cardinal', '6': 'pope', '7': 'archbishop' };
    const tierId = keyMap[input];
    if (tierId) handleHire(tierId);
  });

  // Handle search submission
  // Note: we bypass the LCG for search and go straight from the base-43
  // address to page content. This way the search query maps directly to
  // what the page would display — searching for "." shows the page with ".",
  // etc. The LCG is only used for sequential page generation.
  const handleSearch = useCallback((query) => {
    if (!query || !query.trim()) {
      return;
    }
    const address = queryToPageAddress(query.trim());
    // Convert base-43 state directly to page content (no LCG)
    const content = stateToPage(address, ALPHABET).split('').reverse().join('');
    if (address <= pagesGenerated) {
      const location = locationFromPageOffset(address);
      setSearchResult({ type: 'found', address, content, location });
    } else {
      setSearchResult({ type: 'notFound', address, pagesGenerated });
    }
    setSearchQuery(query.trim());
  }, [pagesGenerated]);

  // Build key prompt string
  const keyPrompt = TIERS.map((tier, i) => {
    const count = playerWorkers[tier.id] || 0;
    const cost = getWorkerCost(tier, count);
    const can = money >= cost;
    const label = `[${i + 1}]${tier.name}`;
    return can ? label : chalk.dim(label);
  }).join('  ');

  // Search hint
  const searchHint = chalk.gray('[S]') + ' Search';

  if (searchOpen) {
    return (
      <SearchOverlay
        searchQuery={searchQuery}
        searchResult={searchResult}
        inputValue={inputValue}
      />
    );
  }

  // Compute dynamic wrap width for LatestPagePanel
  // Right side (flexGrow=3 of 5) is split between Log (flexGrow=2) and LatestPage (flexGrow=1).
  // LatestPage gets ~1/3 of the right column width, minus borders/padding/gap overhead.
  const terminalCols = process.stdout?.columns || 80;
  const wrapWidth = Math.max(20, Math.floor(terminalCols * (1 / 5)) - 5);

  return (
    <Box flexDirection="column">
      {/* Top row: Stats | Storage Scale */}
      <Box flexDirection="row" gap={1}>
        <Box flexGrow={2}>
          <StatsPanel
            pagesGenerated={pagesGenerated}
            currentPage={currentPage}
            money={money}
            pagesPerSecond={pps}
            tickRateLevel={tickRateLevel}
            tickRateCost={tickRateCost}
          />
        </Box>
        <Box flexGrow={3}>
          <StorageScalePanel
            pagesGenerated={pagesGenerated}
          />
        </Box>
      </Box>

      {/* Bottom row: Workers | Log + LatestPage */}
      <Box flexDirection="row" gap={1} marginTop={1}>
        <Box flexGrow={2}>
          <WorkersPanel
            workers={workers}
            playerWorkers={playerWorkers}

            doublingMultipliers={doublingMultipliers}
            doublingProgress={doublingProgress}
            canAfford={canAfford}
          />
        </Box>
        <Box flexGrow={3} flexDirection="row" gap={1}>
          <Box flexGrow={2}>
            <LogPanel log={log} />
          </Box>
          <Box flexGrow={1}>
            <LatestPagePanel
              currentPage={currentPage}
              latestPage={latestPage || ''}
              wrapWidth={wrapWidth}
            />
          </Box>
        </Box>
      </Box>

      {/* Keybind prompt — full width below grid */}
      <Box marginTop={1} flexDirection="column">
        <Text dim>{keyPrompt}  {searchHint}</Text>
        <Text dim>
          {money >= tickRateCost
            ? chalk.green('[U]')
            : chalk.dim('[U]')}
          {' '}Tick Rate Upgrade: {formatMoney(tickRateCost)}{' '}
          <Text dim>Press Ctrl+C to quit</Text>
        </Text>
      </Box>
    </Box>
  );
}

// Create and start the Ink app
const app = render(React.createElement(App));

// Handle graceful shutdown
process.on('SIGINT', () => {
  app.unmount();
  process.exit(0);
});
process.on('SIGTERM', () => {
  app.unmount();
  process.exit(0);
});
