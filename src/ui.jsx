import React, { useState, useCallback } from 'react';
import { Text, Box } from 'ink';
import chalk from 'chalk';
import { TIERS, LOG_MAX_ENTRIES, STORAGE_TIERS } from './config.js';
import { formatNumber, formatMoney, formatPageNumber, wrapText, formatLocationDisplay } from './format.js';
import { getWorkerCost } from './config.js';
import { computeStorageScale } from './storageScale.js';

/**
 * StatsPanel — displays total pages, money, and pages/sec.
 */
export function StatsPanel({ pagesGenerated, currentPage, money, pagesPerSecond, tickRateLevel, tickRateCost }) {
  const tickInterval = Math.max(33, Math.round(1000 - tickRateLevel * 50));
  const tickRate = (1000 / tickInterval).toFixed(1);
  const canAfford = money >= tickRateCost;

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
        <Text> {formatNumber(pagesPerSecond)}</Text>
      </Box>
      <Box>
        <Text bold color={canAfford ? 'green' : 'gray'}>
          Tick rate: {tickRate}/s{' '}
        </Text>
        {tickRateLevel > 0 && <Text dim>(level {formatNumber(tickRateLevel)})</Text>}
      </Box>
      <Box>
        <Text color={canAfford ? 'green' : 'gray'}>
          Upgrade: {formatMoney(tickRateCost)} [U]
        </Text>
      </Box>
    </Box>
  );
}

/**
 * LatestPagePanel — displays the most recently generated page.
 */
export function LatestPagePanel({ currentPage, latestPage, wrapWidth = 70 }) {
  const lines = latestPage ? wrapText(latestPage, wrapWidth) : [];
  const border = chalk.blue('┃');
  const headerLabel = ` Page ${formatPageNumber(currentPage)}`;
  const innerWidth = wrapWidth + 1; // +1 for the border column prefix
  const remaining = Math.max(0, innerWidth - headerLabel.length - 6); // 6 for '━━━' prefix + '━━━' suffix
  const headerFill = '━'.repeat(remaining);
  const header = chalk.blue('┏━━━') + chalk.gray(headerLabel) + chalk.blue(headerFill + '━━━┓');
  const footer = chalk.blue(`┗${'━'.repeat(innerWidth)}┛`);

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
 * Shows player-bought count, doubling multiplier, cost, and doubling progress bar.
 */
export function WorkersPanel({ playerWorkers, doublingMultipliers, doublingProgress, canAfford }) {
  return (
    <Box flexDirection="column" borderColor="green" borderStyle="single" paddingX={1}>
      <Text bold>{chalk.green('👥 Workers')}</Text>
      {TIERS.map((tier, i) => {
        const playerCount = playerWorkers[tier.id] || 0;
        const cost = getWorkerCost(tier, playerCount);
        const can = canAfford[tier.id];
        const multiplier = doublingMultipliers[tier.id] || 1;
        const progress = doublingProgress[tier.id] ?? 0;
        const progressWidth = 16;
        const filled = Math.round(progress * progressWidth);

        return (
          <Box key={tier.id} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
            <Box>
              <Text bold color={can ? 'green' : 'gray'}>
                {can ? chalk.green('[H]') : chalk.dim('[..]')} {tier.name.padEnd(10)}{' '}
                <Text dim>[{i + 1}]</Text>
              </Text>
              <Box>
                <Text>  Count: {formatNumber(playerCount)}</Text>
                {multiplier > 1 && <Text color="yellow"> ×{multiplier}</Text>}
                <Text>  Cost: {formatMoney(cost)}</Text>
              </Box>
              <Box marginLeft={2}>
                <Box>
                  {Array.from({ length: progressWidth }, (_, j) => (
                    <Text key={j} color={j < filled ? 'green' : 'gray'}>
                      {j < filled ? '▓' : '░'}
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

/**
 * StorageScalePanel — displays total pages as escalating storage tiers.
 */
export function StorageScalePanel({ pagesGenerated }) {
  const scale = computeStorageScale(pagesGenerated);

  return (
    <Box flexDirection="column" borderColor="cyan" borderStyle="single" paddingX={1}>
      <Text bold>{chalk.cyan('📦 Storage Scale')}</Text>
      {scale.map((tier, i) => (
        <Box key={tier.name} flexDirection="column" marginTop={i > 0 ? 0.5 : 0}>
          <Text color="gray">
            {tier.emoji} {tier.name.padEnd(25)}{' '}
            <Text color="white">{formatNumber(Number(tier.count))}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
}

/**
 * SearchOverlay — modal overlay for phrase search.
 * Replaces the main UI when open.
 */
export function SearchOverlay({ searchQuery, searchResult, inputValue }) {
  return (
    <Box flexDirection="column" width="100%" height={35} borderColor="cyan" borderStyle="single">
      <Text bold color="cyan">🔍 Search the Library</Text>
      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Box>
          <Text color="gray">Query: </Text>
          <Text color="white">{inputValue}</Text>
        </Box>

        {searchQuery && (
          <>
            <Box flexDirection="column" marginTop={1} paddingX={1}>
              <Text bold color="white">Search Result</Text>
              <Box>
                <Text color="gray">Query: </Text>
                <Text color="white">{searchQuery}</Text>
              </Box>

              {searchResult && searchResult.type === 'found' && (
                <Box flexDirection="column" marginTop={1}>
                  <Box>
                    <Text color="gray">Page: </Text>
                    <Text color="green">{formatPageNumber(searchResult.address)}</Text>
                  </Box>
                  <Box>
                    <Text color="gray">Location: </Text>
                    <Text color="green">{formatLocationDisplay(searchResult.location)}</Text>
                  </Box>
                  <Box flexDirection="column" marginTop={1}>
                    <Text color="gray">Content:</Text>
                    {wrapText(searchResult.content, 70).map((line, i) => (
                      <Text key={i} color="white">{line}</Text>
                    ))}
                  </Box>
                </Box>
              )}

              {searchResult && searchResult.type === 'notFound' && (
                <Box flexDirection="column" marginTop={1} paddingX={1}>
                  <Box>
                    <Text color="yellow">Not yet discovered</Text>
                  </Box>
                  <Box>
                    <Text color="gray">Target page: </Text>
                    <Text color="yellow">{formatPageNumber(searchResult.address)}</Text>
                  </Box>
                  <Box>
                    <Text color="gray">Pages generated: </Text>
                    <Text color="gray">{formatPageNumber(searchResult.pagesGenerated)}</Text>
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text dim>Enter to search  •  Escape to close</Text>
      </Box>
    </Box>
  );
}
