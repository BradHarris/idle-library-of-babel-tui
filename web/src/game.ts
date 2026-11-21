import { createContext } from 'solid-js';
import type { GameStore } from '@game/store';

/** The running game. No default: useContext throws if there's no provider. */
export const GameContext = createContext<GameStore>();
