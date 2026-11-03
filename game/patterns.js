/**
 * Incomplete starter designs for 香遇 · 合香工坊.
 * Colors describe the artwork; these are not production or ingredient formulas.
 * createPattern(id, size=20): fresh v1 free-play state with 6–8 beads and gaps.
 * mirrorBeads(state): copy clockwise/right semicircle onto left semicircle.
 */
import { createState, validateState, PALETTES } from './game-core.js';

export const PATTERNS = Object.freeze([
  Object.freeze({ id: 'moon', name: '月白留香', mood: 'slow', palette: 'natural', description: '月白与浅木先落几颗，把余下的留白交给你。', icon: '☾' }),
  Object.freeze({ id: 'forest', name: '山青有序', mood: 'focus', palette: 'blue', description: '山青色里穿插圆珠与切面珠，接着搭出你的节奏。', icon: '△' }),
  Object.freeze({ id: 'letter', name: '花间来信', mood: 'warm', palette: 'lilac', description: '让柔和花色与米珠，替你写一封小小的心情来信。', icon: '♡' })
]);

/** Unknown IDs fall back to 月白留香; unsupported sizes fall back to 20. */
export function createPattern(id, size = 20) {
  const pattern = PATTERNS.find(item => item.id === id) || PATTERNS[0];
  const state = createState({ mood: pattern.mood, palette: pattern.palette, name: pattern.name, size, shape: pattern.id === 'forest' ? 'faceted' : pattern.id === 'letter' ? 'oval' : 'round', mode: 'free' });
  const n = state.size, half = n / 2;
  const colors = PALETTES.find(item => item.id === pattern.palette).colors;
  const seed = (index, bead, shape, color) => { state.beads[index] = { id: bead, shape, color }; };
  if (pattern.id === 'moon') {
    // Six points of light, with every other bead left for the player.
    seed(0, 'jasmine', 'round', colors[1]);
    seed(half, 'jasmine', 'round', colors[1]);
    for (const index of [2, n - 2]) seed(index, 'sandalwood', 'round', colors[0]);
    for (const index of [4, n - 4]) seed(index, 'cedar', 'round', colors[4]);
  } else if (pattern.id === 'forest') {
    seed(0, 'cedar', 'faceted', colors[0]);
    seed(half, 'cedar', 'faceted', colors[0]);
    for (const index of [1, n - 1]) seed(index, 'sandalwood', 'round', colors[1]);
    for (const index of [3, n - 3]) seed(index, 'mugwort', 'faceted', colors[3]);
    for (const index of [half - 1, half + 1]) seed(index, 'cedar', 'round', colors[2]);
  } else {
    seed(0, 'osmanthus', 'oval', colors[0]);
    for (const index of [1, n - 1]) seed(index, 'jasmine', 'round', colors[1]);
    for (const index of [3, n - 3]) seed(index, 'sandalwood', 'oval', colors[4]);
    for (const index of [half - 2, half + 2]) seed(index, 'osmanthus', 'round', colors[3]);
  }
  return validateState(state);
}

/**
 * Index 0 is the top, n/2 the bottom. Indices 1..n/2-1 (clockwise/right)
 * are authoritative and copied to n-i (left), including null gaps. This
 * preserves both axis beads and never reads back from a reflected target.
 * The result and every bead object are independent of the input; no mutation.
 */
export function mirrorBeads(state) {
  const next = validateState(state);
  if (!next) throw new TypeError('无效的串珠状态');
  for (let i = 1; i < next.size / 2; i++) {
    const source = next.beads[i];
    next.beads[next.size - i] = source ? { ...source } : null;
  }
  return next;
}
