import React, { useState, useEffect, useCallback } from 'react';
import { render, Text, Box, useInput } from 'ink';
import chalk from 'chalk';
import { TIERS, getWorkerCost } from './config.js';
import { useGameStore } from './stores/gameStore.js';
import { StatsPanel, LatestPagePanel, WorkersPanel, LogPanel, StorageScalePanel } from './ui.jsx';
import { formatMoney, formatNumber } from './format.js';

/**
 * Main App component — arranges all four panels in a grid layout.
 */
export function App() {
  const [renderTick, setRenderTick] = useState(0);

  // Subscribe to store state via selectors
  const pagesGenerated = useGameStore(s => s.pagesGenerated);
  const currentPage = useGameStore(s => s.currentPage);
  const money = useGameStore(s => s.money);
  const workers = useGameStore(s => s.workers);
  const log = useGameStore(s => s.log);
  const tickRateLevel = useGameStore(s => s.tickRateLevel);
  const tickRateCost = useGameStore(s => s.tickRateCost);
  const pps = useGameStore(s => s.pps);
  const canAfford = useGameStore(s => s.canAfford);
  const tickInterval = useGameStore(s => s.tickInterval);
  const latestPage = useGameStore(s => s.latestPage);

  // Force re-render at ~100ms for smooth UI updates
  useEffect(() => {
    const interval = setInterval(() => setRenderTick(t => t + 1), 100);
    return () => clearInterval(interval);
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

  // Key input for hiring (keys 1-7) and tick rate upgrade (u)
  useInput((input) => {
    if (input === 'u') {
      handleTickRateUpgrade();
      return;
    }
    const keyMap = { '1': 'writer', '2': 'manager', '3': 'overseer', '4': 'rector', '5': 'cardinal', '6': 'pope', '7': 'archbishop' };
    const tierId = keyMap[input];
    if (tierId) handleHire(tierId);
  });

  // Build key prompt string
  const keyPrompt = TIERS.map((tier, i) => {
    const count = workers[tier.id] || 0;
    const cost = getWorkerCost(tier, count);
    const can = money >= cost;
    const label = `[${i + 1}]${tier.name}`;
    return can ? label : chalk.dim(label);
  }).join('  ');

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Stats Panel — top */}
      <StatsPanel
        pagesGenerated={pagesGenerated}
        currentPage={currentPage}
        money={money}
        pagesPerSecond={pps}
        tickRateLevel={tickRateLevel}
        tickRateCost={tickRateCost}
      />

      {/* Storage Scale Panel — below stats */}
      <StorageScalePanel
        pagesGenerated={pagesGenerated}
      />

      {/* Latest Page Panel — below storage scale */}
      <LatestPagePanel
        currentPage={currentPage}
        latestPage={latestPage || ''}
      />

      {/* Workers and Log — side by side */}
      <Box marginTop={1}>
        <Box flexDirection="column" flex={1}>
          <WorkersPanel
            workers={workers}
            canAfford={canAfford}
          />
        </Box>
        <Box marginLeft={1} flex={1}>
          <LogPanel log={log} />
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dim>{keyPrompt}</Text>
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
