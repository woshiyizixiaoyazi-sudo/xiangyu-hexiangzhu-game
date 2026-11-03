/**
 * Browser-storage adapter for the existing 香遇 v1 save format.
 * No globals, event listeners or cross-tab policy. Storage is supplied by caller.
 * Unknown JSON fields are ignored; every returned object contains known fields only.
 */
import { validateState, deriveRecipe, CHALLENGES } from './game-core.js';

export const SAVE_KEY = 'xiangyu-workshop-v1';
export const BACKUP_KEY = SAVE_KEY + '-previous';
const MAX_SAVE_LENGTH = 200000;
const WORK_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Strict draft validation; individually damaged saved works are discarded. */
export function parseSave(text) {
  try {
    if (typeof text !== 'string' || !text || text.length > MAX_SAVE_LENGTH) return null;
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 1) return null;
    const draft = validateState(raw.draft);
    if (!draft || !Array.isArray(raw.works) || raw.works.length > 24 || !Array.isArray(raw.completed) || typeof raw.sound !== 'boolean') return null;
    const ids = new Set();
    const works = [];
    for (const work of raw.works) {
      if (!work || typeof work !== 'object' || Array.isArray(work) || typeof work.id !== 'string' || !WORK_ID.test(work.id) || ids.has(work.id)) continue;
      if (typeof work.date !== 'string' || work.date.length > 64 || CONTROL.test(work.date)) continue;
      const design = validateState(work.state);
      if (!design || !design.beads.every(Boolean) || deriveRecipe(design).scentedTotal === 0) continue;
      ids.add(work.id);
      works.push({ id: work.id, date: work.date, state: design });
    }
    const completed = [...new Set(raw.completed.filter(index => Number.isInteger(index) && index >= 0 && index < CHALLENGES.length))];
    return { v: 1, draft, works, completed, sound: raw.sound };
  } catch {
    return null;
  }
}

/** Prefer main, then previous valid save; recovery never overwrites either key. */
export function readSave(storage) {
  let main;
  try { main = storage.getItem(SAVE_KEY); } catch { return { data: null, status: 'unavailable' }; }
  const current = parseSave(main);
  if (current) return { data: current, status: 'ok' };
  let previous;
  try { previous = storage.getItem(BACKUP_KEY); } catch { return { data: null, status: 'unavailable' }; }
  const recovered = parseSave(previous);
  if (recovered) return { data: recovered, status: 'recovered' };
  return { data: null, status: main === null && previous === null ? 'empty' : 'invalid' };
}

export function readPrevious(storage) {
  try { return parseSave(storage.getItem(BACKUP_KEY)); } catch { return null; }
}

/**
 * Preserve the valid original main before replacing it. A failed backup rotation
 * does not block main. backupOK means no rotation was needed, or it succeeded.
 * Web Storage setItem is atomic: a quota/security failure leaves its key intact.
 */
export function writeSave(storage, data) {
  let next, nextText;
  try {
    next = parseSave(JSON.stringify(data));
    if (!next) return { ok: false, backupOK: false };
    nextText = JSON.stringify(next);
  } catch { return { ok: false, backupOK: false }; }
  let oldText;
  try { oldText = storage.getItem(SAVE_KEY); } catch { return { ok: false, backupOK: false }; }
  const oldData = parseSave(oldText);
  // Repeated autosaves must not replace the previous design with the current one.
  if (oldData && JSON.stringify(oldData) === nextText) return { ok: true, backupOK: true };
  let backupOK = true;
  if (oldData) {
    try { storage.setItem(BACKUP_KEY, oldText); } catch { backupOK = false; }
  }
  try {
    storage.setItem(SAVE_KEY, nextText);
    return { ok: true, backupOK };
  } catch {
    return { ok: false, backupOK };
  }
}
