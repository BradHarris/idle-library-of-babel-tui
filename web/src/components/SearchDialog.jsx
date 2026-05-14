import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useGameStore } from '@game/stores/gameStore';
import { queryToPageAddress } from '@game/page';
import { stateToPage } from '@game/lcg';
import { ALPHABET } from '@game/page';
import { locationFromPageOffset } from '@game/storageScale';
import { formatPageNumber, formatLocationDisplay, wrapText } from '@game/format';

export function SearchDialog() {
  const pagesGenerated = useGameStore(s => s.pagesGenerated);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);

  const handleSearch = () => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    const address = queryToPageAddress(trimmed);
    const content = stateToPage(address, ALPHABET).split('').reverse().join('');

    if (address <= pagesGenerated) {
      const loc = locationFromPageOffset(address);
      setResult({ type: 'found', address, content, location: loc });
    } else {
      setResult({ type: 'notFound', address });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResult(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors cursor-pointer">
          🔍 Search
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gray-900 border border-cyan-500/50 rounded-xl shadow-2xl p-6 outline-none">
          <Dialog.Title className="text-lg font-bold text-cyan-400 mb-4">
            🔍 Search the Library
          </Dialog.Title>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a phrase to search..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded font-medium transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>

          {result && result.type === 'found' && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Page:</span>
                <span className="text-green-400 font-mono">{formatPageNumber(result.address)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Location:</span>
                <span className="text-green-400">{formatLocationDisplay(result.location)}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Content:</span>
                <div className="font-mono text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap break-all leading-relaxed">
                  {wrapText(result.content, 55).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result && result.type === 'notFound' && (
            <div className="space-y-2 text-sm">
              <p className="text-yellow-400 font-medium">Not yet discovered</p>
              <div className="flex justify-between">
                <span className="text-gray-400">Target page:</span>
                <span className="text-yellow-400 font-mono">{formatPageNumber(result.address)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pages generated:</span>
                <span className="text-gray-400 font-mono">{formatPageNumber(pagesGenerated)}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
