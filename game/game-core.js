/**
 * 香遇 · 合香工坊 — dependency-free, deterministic game rules.
 * All public state changes return new objects. Persist only validateState output.
 * State v1: {v,mood,palette,shape,size,beads:[null|{id,shape,color}],name,mode,challenge}
 * deriveRecipe(state) counts visual bead choices; percentages are NOT ingredient mass.
 * Share tokens carry designs only (no account or progress) and are bounded/validated.
 */

export const MOODS = Object.freeze([
  { id: 'slow', name: '想慢下来', title: '留白', icon: '◌', scent: '柔和木香', story: '收一点色彩，给今天留一点呼吸。', palette: 'natural', beadIds: ['sandalwood', 'agar', 'cedar'], recipe: ['sandalwood','sandalwood','cedar','agar'], color: '#547967' },
  { id: 'focus', name: '想专注一点', title: '山序', icon: '△', scent: '草木清香', story: '一珠一序，陪你做眼前的一件事。', palette: 'blue', beadIds: ['cedar', 'mugwort', 'sandalwood'], recipe: ['cedar','mugwort','cedar','sandalwood'], color: '#3d667c' },
  { id: 'fresh', name: '想有点新鲜感', title: '朝光', icon: '☀', scent: '清新柑橘', story: '浅木色里，放进一点明亮的变化。', palette: 'natural', beadIds: ['citrus', 'sandalwood', 'amber'], recipe: ['citrus','sandalwood','citrus','amber'], color: '#b2752a' },
  { id: 'warm', name: '想被温柔陪伴', title: '暖枝', icon: '♡', scent: '淡雅花香', story: '一缕花木香，给日常一个柔软的细节。', palette: 'lilac', beadIds: ['jasmine', 'osmanthus', 'sandalwood'], recipe: ['jasmine','sandalwood','osmanthus','sandalwood'], color: '#936779' },
  { id: 'joy', name: '想记录开心', title: '若喜', icon: '✧', scent: '明亮花木香', story: '用一颗点缀，留下今天的小小好心情。', palette: 'red', beadIds: ['osmanthus', 'citrus', 'amber'], recipe: ['osmanthus','citrus','osmanthus','amber'], color: '#b35143' }
]);

export const BEADS = Object.freeze([
  { id: 'sandalwood', name: '檀香', family: '木香', color: '#b68e5e', dark: '#6e4e31', info: '温润的木质气味联想。', scented: true },
  { id: 'cedar', name: '雪松', family: '木香', color: '#718378', dark: '#3f5648', info: '清淡草木与干净木纹的联想。', scented: true },
  { id: 'citrus', name: '陈皮', family: '柑橘', color: '#d69b48', dark: '#90642d', info: '明亮果皮与暖木尾韵的联想。', scented: true },
  { id: 'osmanthus', name: '桂花', family: '花香', color: '#dfbb6e', dark: '#a67c37', info: '细腻花香与秋日暖意的联想。', scented: true },
  { id: 'jasmine', name: '茉莉', family: '花香', color: '#e4dfca', dark: '#9a957f', info: '轻盈白花与月白色泽的联想。', scented: true },
  { id: 'mugwort', name: '艾草', family: '草木', color: '#799578', dark: '#405d42', info: '清新叶片与草木气息的联想。', scented: true },
  { id: 'agar', name: '沉香', family: '木香', color: '#79584b', dark: '#49312a', info: '沉静深木色与层次木香的联想。', scented: true },
  { id: 'amber', name: '琥珀色点缀', family: '点缀', color: '#d99847', dark: '#8a5827', info: '装饰色珠，不计入香气种类。', scented: false }
]);

export const PALETTES = Object.freeze([
  { id: 'natural', name: '原木日光', colors: ['#b68e5e','#e4dfca','#79584b','#d69b48','#799578'] },
  { id: 'blue', name: '山青月白', colors: ['#547b83','#dce5dc','#344e60','#8daaa0','#b7cbd0'] },
  { id: 'red', name: '朱红暖枝', colors: ['#ab5043','#e5bd83','#793d38','#e9d9bd','#c8856a'] },
  { id: 'lilac', name: '微醺花园', colors: ['#a58ea8','#e7d9df','#735c84','#c4acbe','#cbbf9a'] }
]);
export const SHAPES = Object.freeze([
  { id: 'round', name: '圆珠' },
  { id: 'oval', name: '米珠' },
  { id: 'faceted', name: '切面珠' }
]);

export const CHALLENGES = Object.freeze([
  { id: 'first', name: '初见成串', title: '第一串，送给此刻的你', description: '填满整串，并使用至少 2 种香珠。', hint: '点击珠盘添加；也能拖到虚线珠位。' },
  { id: 'forest', name: '草木有序', title: '把一片小森林戴在手上', description: '填满整串，木香珠至少占一半，并加入艾草。', hint: '檀香、雪松、沉香都属于木香。' },
  { id: 'blossom', name: '花间留白', title: '温柔，也可以有形状', description: '填满整串，加入桂花和茉莉，并使用至少 2 种珠型。', hint: '换一种珠型，再加一颗到手串里。' },
  { id: 'signature', name: '随心成章', title: '这一串，只有你会这样搭', description: '填满整串，使用至少 4 种香珠、3 种珠型与 3 种颜色。', hint: '选择珠型和配色，逐颗留下你的签名。' }
]);

const MOOD_IDS = new Set(MOODS.map(x => x.id));
const BEAD_MAP = new Map(BEADS.map(x => [x.id, x]));
const PALETTE_IDS = new Set(PALETTES.map(x => x.id));
const SHAPE_IDS = new Set(SHAPES.map(x => x.id));
const SIZES = new Set([16, 20, 24]);
const HEX = /^#[0-9a-f]{6}$/i;
const MAX_TOKEN_LENGTH = 5500;

function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function shortName(value, fallback) {
  if (typeof value !== 'string') return fallback;
  return [...value.replace(/[\u0000-\u001f\u007f]/g, '').trim()].slice(0, 24).join('') || fallback;
}

export function createState(overrides = {}) {
  // Optional configuration can come from a missing/malformed saved preference.
  if (!plain(overrides)) overrides = {};
  const mood = MOOD_IDS.has(overrides.mood) ? overrides.mood : 'slow';
  const moodData = getRecommendation(mood);
  const size = SIZES.has(overrides.size) ? overrides.size : 20;
  const state = {
    v: 1, mood,
    palette: PALETTE_IDS.has(overrides.palette) ? overrides.palette : moodData.palette,
    shape: SHAPE_IDS.has(overrides.shape) ? overrides.shape : 'round',
    size,
    beads: Array(size).fill(null),
    name: shortName(overrides.name, moodData.title),
    mode: overrides.mode === 'challenge' ? 'challenge' : 'free',
    challenge: Number.isInteger(overrides.challenge) && overrides.challenge >= 0 && overrides.challenge < CHALLENGES.length ? overrides.challenge : 0
  };
  if (Array.isArray(overrides.beads) && overrides.beads.length === size) {
    const candidate = validateState({ ...state, beads: overrides.beads });
    if (candidate) return candidate;
  }
  return state;
}

/** Validate untrusted save/share input; deliberately drops unknown top-level keys. */
export function validateState(raw) {
  if (!plain(raw) || raw.v !== 1 || !MOOD_IDS.has(raw.mood) || !PALETTE_IDS.has(raw.palette) || !SHAPE_IDS.has(raw.shape) || !SIZES.has(raw.size)) return null;
  if (raw.mode !== 'free' && raw.mode !== 'challenge') return null;
  if (!Number.isInteger(raw.challenge) || raw.challenge < 0 || raw.challenge >= CHALLENGES.length) return null;
  if (!Array.isArray(raw.beads) || raw.beads.length !== raw.size) return null;
  if (typeof raw.name !== 'string' || [...raw.name].length > 24) return null;
  const beads = [];
  for (const bead of raw.beads) {
    if (bead === null) { beads.push(null); continue; }
    if (!plain(bead) || !BEAD_MAP.has(bead.id) || !SHAPE_IDS.has(bead.shape) || typeof bead.color !== 'string' || !HEX.test(bead.color)) return null;
    beads.push({ id: bead.id, shape: bead.shape, color: bead.color.toLowerCase() });
  }
  return { v: 1, mood: raw.mood, palette: raw.palette, shape: raw.shape, size: raw.size, beads, name: shortName(raw.name, getRecommendation(raw.mood).title), mode: raw.mode, challenge: raw.challenge };
}

export function getRecommendation(moodId) {
  return MOODS.find(x => x.id === moodId) || MOODS[0];
}

/** Adds to first empty spot, or replaces an explicit spot. Invalid/full = unchanged copy. */
export function addBead(state, id, index, options = {}) {
  const clean = validateState(state);
  if (!clean) throw new TypeError('无效的串珠状态');
  if (!plain(options)) options = {};
  const type = BEAD_MAP.get(id);
  if (!type) return clean;
  const target = index === undefined ? clean.beads.findIndex(x => x === null) : index;
  if (!Number.isInteger(target) || target < 0 || target >= clean.size) return clean;
  clean.beads[target] = {
    id,
    shape: SHAPE_IDS.has(options.shape) ? options.shape : clean.shape,
    color: typeof options.color === 'string' && HEX.test(options.color) ? options.color.toLowerCase() : type.color
  };
  return clean;
}

/** Whole-number percentages use largest remainders and always sum to 100 if nonempty. */
export function deriveRecipe(state) {
  const clean = validateState(state);
  if (!clean) throw new TypeError('无效的串珠状态');
  const filled = clean.beads.filter(Boolean);
  const total = filled.length;
  const rows = BEADS.map(type => {
    const count = filled.filter(x => x.id === type.id).length;
    return { id: type.id, name: type.name, count, percent: total ? Math.floor(count * 100 / total) : 0, family: type.family, color: type.color, scented: type.scented, remainder: total ? count * 100 % total : 0 };
  }).filter(x => x.count);
  let extra = total ? 100 - rows.reduce((sum, x) => sum + x.percent, 0) : 0;
  const ranked = rows.map((row, index) => ({ row, index })).sort((a,b) => b.row.remainder - a.row.remainder || a.index - b.index);
  for (let i = 0; i < extra; i++) ranked[i].row.percent++;
  rows.forEach(row => delete row.remainder);
  const scentedTotal = rows.filter(x => x.scented).reduce((sum, x) => sum + x.count, 0);
  const families = [...new Set(rows.filter(x => x.scented).map(x => x.family))];
  return { total, scentedTotal, decorativeTotal: total - scentedTotal, rows, families, full: total === clean.size, scentKinds: rows.filter(x => x.scented).length };
}

export function checkChallenge(state, index) {
  const clean = validateState(state);
  if (!clean) throw new TypeError('无效的串珠状态');
  if (index === undefined) index = clean.challenge;
  // Array property coercion must never bypass a chapter's numeric rule branch.
  if (!Number.isInteger(index) || index < 0 || index >= CHALLENGES.length) return { passed: false, progress: 0, target: 1, checks: [], description: '关卡不存在' };
  const challenge = CHALLENGES[index];
  if (!challenge) return { passed: false, progress: 0, target: 1, checks: [], description: '关卡不存在' };
  const recipe = deriveRecipe(clean);
  const filled = clean.beads.filter(Boolean);
  const types = new Set(filled.map(x => x.id));
  const shapes = new Set(filled.map(x => x.shape));
  const colors = new Set(filled.map(x => x.color));
  const checks = [{ label: `串满 ${clean.size} 颗`, ok: recipe.full }];
  if (index === 0) checks.push({ label: '至少 2 种香珠', ok: recipe.scentKinds >= 2 });
  if (index === 1) {
    const wood = recipe.rows.filter(x => x.family === '木香').reduce((sum,x) => sum+x.count,0);
    checks.push({ label: '木香珠至少占一半', ok: wood >= clean.size / 2 }, { label: '加入艾草', ok: types.has('mugwort') });
  }
  if (index === 2) checks.push({ label: '加入桂花与茉莉', ok: types.has('osmanthus') && types.has('jasmine') }, { label: '至少 2 种珠型', ok: shapes.size >= 2 });
  if (index === 3) checks.push({ label: '至少 4 种香珠', ok: recipe.scentKinds >= 4 }, { label: '3 种珠型', ok: shapes.size === 3 }, { label: '至少 3 种颜色', ok: colors.size >= 3 });
  return { passed: checks.every(x => x.ok), progress: checks.filter(x => x.ok).length, target: checks.length, checks, description: challenge.description };
}

export function getAchievements(works = []) {
  const states = (Array.isArray(works) ? works : []).map(work => validateState(work?.state || work)).filter(Boolean).filter(state => state.beads.every(Boolean));
  const moods = new Set(states.map(x => x.mood));
  const shapes = new Set(states.flatMap(x => x.beads.map(bead => bead.shape)));
  const challenges = new Set(states.filter(x => x.mode === 'challenge' && checkChallenge(x).passed).map(x => x.challenge));
  return [
    { id: 'first', name: '初遇香气', description: '收藏第一串完整作品', unlocked: states.length >= 1, progress: Math.min(states.length,1), target: 1 },
    { id: 'three', name: '手作日常', description: '收藏 3 串完整作品', unlocked: states.length >= 3, progress: Math.min(states.length,3), target: 3 },
    { id: 'moods', name: '五味心情', description: '收藏 5 种心情的作品', unlocked: moods.size === 5, progress: moods.size, target: 5 },
    { id: 'shapes', name: '形状诗人', description: '收藏作品中集齐 3 种珠型', unlocked: shapes.size === 3, progress: shapes.size, target: 3 },
    { id: 'master', name: '合香玩家', description: '完成并收藏 4 个关卡', unlocked: challenges.size === 4, progress: challenges.size, target: 4 }
  ];
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === 'function') return btoa(binary);
  return globalThis.Buffer.from(bytes).toString('base64');
}
function base64ToBytes(base64) {
  if (typeof atob === 'function') return Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
  return new Uint8Array(globalThis.Buffer.from(base64, 'base64'));
}

/** token is URL-safe base64 UTF-8; use as #design=<token>. */
export function encodeShare(state) {
  const clean = validateState(state);
  if (!clean) throw new TypeError('无效的串珠状态');
  const packed = [1,clean.mood,clean.palette,clean.shape,clean.size,clean.name,clean.mode,clean.challenge,clean.beads.map(x => x ? [x.id,x.shape,x.color] : null)];
  const token = bytesToBase64(new TextEncoder().encode(JSON.stringify(packed))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  if (token.length > MAX_TOKEN_LENGTH) throw new RangeError('分享内容过长');
  return token;
}

export function decodeShare(token) {
  try {
    if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
    const base64 = token.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-token.length%4)%4);
    const packed = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(base64ToBytes(base64)));
    if (!Array.isArray(packed) || packed.length !== 9 || !Array.isArray(packed[8]) || packed[8].length > 24) return null;
    const [v,mood,palette,shape,size,name,mode,challenge,beads] = packed;
    const unpacked = beads.map(x => x === null ? null : (Array.isArray(x) && x.length === 3 ? {id:x[0],shape:x[1],color:x[2]} : false));
    return validateState({v,mood,palette,shape,size,name,mode,challenge,beads:unpacked});
  } catch { return null; }
}
