import type { HeroAction } from "../shared/command-types.js";
import type { Hero, MatchState } from "../shared/game-types.js";
import { legalHeroActions } from "./combat/hero-actions.js";
export const actionKey = (action: HeroAction) => JSON.stringify(action);
export const legalActions = (state: MatchState, hero: Hero) => legalHeroActions(state, hero);
