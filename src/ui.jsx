import React from 'react';
import { Text, Box, useApp } from 'ink';
import chalk from 'chalk';
import { TIERS, LOG_MAX_ENTRIES } from './config.js';
import { formatNumber, formatMoney, formatPageNumber, formatPagesPerSecond, wrapText } from './format.js';
import { getWorkerCost, purchaseWorker } from './game.js';

/**
 * StatsPanel — displays total pages, money, and pages/sec.
 */
export function StatsPanel({ pagesGenerated, currentPage, money, pagesPerSecond }) {
  return (
    <Box flexDirection="column" borderColor="blue" borderStyle="single" paddingX={1}>
      <Text bold>{chalk.blue('📖 THE LIBRARY OF BABEL')}</Text>
      <Box marginTop={1}>
        <Text bold>{chalk.gray('Pages Generated:')}</Text>
        <Text> {formatPageNumber(pagesGenerated)}</Text>
      </Box>
      <Box>
        <Text bold>{chalk.gray('Current Page:')}</Text>
        <Text> {formatPageNumber(currentPage)}</Text>
      </Box>
      <Box>
        <Text bold>{chalk.green('Money:')}</Text>
        <Text> {formatMoney(money)}</Text>
      </Box>
      <Box>
        <Text bold>{chalk.gray('Pages/sec:')}</Text>
        <Text> {formatPagesPerSecond(pagesPerSecond)}</Text>
      </Box>
    </Box>
  );
}

/**
 * LatestPagePanel — displays the most recently generated page.
 */
export function LatestPagePanel({ currentPage, latestPage }) {
  const lines = latestPage ? wrapText(latestPage, 70) : [];
  const border = chalk.blue('┃');
  const header = chalk.blue('┏━━━') + chalk.gray(' Page ') + chalk.blue(String(currentPage).padEnd(35)) + chalk.blue('━━━┓');
  const footer = chalk.blue('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

  return (
    <Box flexDirection="column" borderColor="blue" borderStyle="single" paddingX={1}>
      <Text>{header}</Text>
      {lines.map((line, i) => (
        <Text key={i} color="gray">
          {border} <Text color="white">{line}</Text>
        </Text>
      ))}
      <Text>{footer}</Text>
    </Box>
  );
}

/**
 * WorkersPanel — displays all 7 worker tiers with hire keybinds.
 */
export function WorkersPanel({ workers, canAfford }) {
  return (
    <Box flexDirection="column" borderColor="green" borderStyle="single" paddingX={1}>
      <Text bold>{chalk.green('👥 Workers')}</Text>
      {TIERS.map((tier, i) => {
        const count = workers[tier.id] || 0;
        const cost = getWorkerCost(tier, count);
        const can = canAfford[tier.id];
        const isOwned = count > 0;
        const progressWidth = 18;
        const progress = Math.min(i / (TIERS.length - 1), 1);
        const filled = Math.round(progress * progressWidth);

        return (
          <Box key={tier.id} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
            <Box>
              <Text bold isHighlighted={isOwned} color={can ? 'green' : 'gray'}>
                {can ? chalk.green('[H]') : chalk.dim('[..]')} {tier.name.padEnd(10)}{' '}
                <Text dim>[{i + 1}]</Text>
              </Text>
              <Box>
                <Text>  Count: {String(count).padStart(5)}</Text>
                <Text>  Cost: {formatMoney(cost)}</Text>
              </Box>
              <Box marginLeft={2}>
                <Box>
                  {Array.from({ length: progressWidth }, (_, j) => (
                    <Text key={j} color={j < filled ? 'green' : 'gray'}>
                      {j < filled ? '█' : '░'}
                    </Text>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * LogPanel — displays recent events with timestamps.
 */
export function LogPanel({ log }) {
  const recent = log.slice(0, LOG_MAX_ENTRIES);

  return (
    <Box flexDirection="column" borderColor="yellow" borderStyle="single" paddingX={1}>
      <Text bold>{chalk.yellow('📋 Event Log')}</Text>
      {recent.length === 0 ? (
        <Text dim>Starting up...</Text>
      ) : (
        recent.map((entry, i) => (
          <Text key={i} color="gray">
            <Text color="white">{entry.timestamp}</Text> {entry.message}
          </Text>
        ))
      )}
    </Box>
  );
}
