import React, { useState, useRef, useEffect, useCallback } from 'react';
import { render, Text, Box, useInput } from 'ink';
import chalk from 'chalk';
import { TIERS } from './config.js';
import { createInitialState, tick, calcPagesPerSecond, purchaseWorkerPure, getWorkerCost } from './game.js';
import { StatsPanel, LatestPagePanel, WorkersPanel, LogPanel } from './ui.jsx';

/**
 * Main App component — arranges all four panels in a grid layout.
 */
export function App() {
  const [gameState, setGameState] = useState(createInitialState);
  const [terminalWidth, setTerminalWidth] = useState(Math.max(80, 120));
  const gameStateRef = useRef(gameState);
  const tickTimerRef = useRef(null);
  const renderTimerRef = useRef(null);

  // Keep ref in sync with state for tick access
  gameStateRef.current = gameState;

  // Handle terminal resize
  useEffect(() => {
    const onResize = () => {
      setTerminalWidth(process.stdout.columns || 120);
    };
    process.stdout.on?.('resize', onResize);
    onResize();
    return () => {
      process.stdout.off?.('resize', onResize);
    };
  }, []);

  // Logic tick — runs at TICK_INTERVAL (50ms)
  useEffect(() => {
    const TICK_INTERVAL = 50;
    tickTimerRef.current = setInterval(() => {
      const state = gameStateRef.current;
      const newState = tick({ ...state });
      setGameState(newState);
    }, TICK_INTERVAL);

    return () => {
      if (tickTimerRef.current) {
        clearInterval(tickTimerRef.current);
      }
    };
  }, []);

  // Render interval — runs at RENDER_INTERVAL (100ms)
  const RENDER_INTERVAL = 100;
  useEffect(() => {
    renderTimerRef.current = setInterval(() => {
      setGameState((prev) => ({ ...prev }));
    }, RENDER_INTERVAL);

    return () => {
      if (renderTimerRef.current) {
        clearInterval(renderTimerRef.current);
      }
    };
  }, []);

  // Graceful exit cleanup
  useEffect(() => {
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      if (renderTimerRef.current) clearInterval(renderTimerRef.current);
    };
  }, []);

  // Handle worker hire
  const handleHire = useCallback((tierId) => {
    setGameState((prev) => {
      const { state } = purchaseWorkerPure(prev, tierId);
      return state;
    });
  }, []);

  // Key input for hiring (keys 1-7)
  useInput((input) => {
    const keyMap = { '1': 'writer', '2': 'manager', '3': 'overseer', '4': 'rector', '5': 'cardinal', '6': 'pope', '7': 'archbishop' };
    const tierId = keyMap[input];
    if (tierId) handleHire(tierId);
  });

  // Derived values for the UI
  const pps = calcPagesPerSecond(gameState.workers);

  // Calculate affordability per tier
  const canAfford = {};
  for (const tier of TIERS) {
    const count = gameState.workers[tier.id] || 0;
    const cost = getWorkerCost(tier, count);
    canAfford[tier.id] = gameState.money >= cost;
  }

  // Build key prompt string
  const keyPrompt = TIERS.map((tier, i) => {
    const count = gameState.workers[tier.id] || 0;
    const cost = getWorkerCost(tier, count);
    const can = gameState.money >= cost;
    const label = `[${i + 1}]${tier.name}`;
    return can ? label : chalk.dim(label);
  }).join('  ');

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Stats Panel — top */}
      <StatsPanel
        pagesGenerated={gameState.pagesGenerated}
        currentPage={gameState.currentPage}
        money={gameState.money}
        pagesPerSecond={pps}
      />

      {/* Latest Page Panel — below stats */}
      <LatestPagePanel
        currentPage={gameState.currentPage}
        latestPage={gameState._latestPage || ''}
      />

      {/* Workers and Log — side by side */}
      <Box marginTop={1}>
        <Box flexDirection="column" flex={1}>
          <WorkersPanel
            workers={gameState.workers}
            canAfford={canAfford}
          />
        </Box>
        <Box marginLeft={1} flex={1}>
          <LogPanel log={gameState.log} />
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dim>{keyPrompt}</Text>
        <Text dim>  Press Ctrl+C to quit</Text>
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
