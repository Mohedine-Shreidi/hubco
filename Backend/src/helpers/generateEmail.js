/**
 * generateEmail.js
 *
 * Deterministic, readable email generation from a full name.
 * Format: firstname.lastname@hub.com
 *
 * Rules:
 *  - Lowercase everything
 *  - Transliterate non-Latin characters to Latin
 *  - Strip anything that isn't a-z, 0-9, or dot
 *  - Collapse consecutive dots, strip leading/trailing dots
 *  - On collision, append an incremental numeric suffix (1, 2, 3…)
 *  - Uniqueness is enforced inside a SERIALIZABLE transaction
 */

import sql from '../db/index.js';

/* ── Transliteration map ─────────────────────────────────── */
const TRANSLITERATE = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', æ: 'ae',
  ç: 'c', č: 'c', ć: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e', ě: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ð: 'd', đ: 'd',
  ñ: 'n', ń: 'n', ň: 'n',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u', ů: 'u',
  ý: 'y', ÿ: 'y',
  ž: 'z', ź: 'z', ż: 'z',
  ß: 'ss', þ: 'th',
  ł: 'l', ş: 's', ș: 's', ţ: 't', ț: 't', ğ: 'g',
  // Arabic → common Latin equivalents
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't',
  'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
  'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': '', 'ؤ': 'w', 'ئ': 'y',
};

/**
 * Transliterate a string: map known characters, use NFD decomposition
 * for remaining accented characters, then strip non-ASCII leftovers.
 */
function transliterate(str) {
  let result = '';
  for (const ch of str) {
    if (TRANSLITERATE[ch] !== undefined) {
      result += TRANSLITERATE[ch];
    } else {
      result += ch;
    }
  }
  // NFD decomposition strips combining diacritical marks (accents)
  return result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip combining marks
    .replace(/[^\x00-\x7F]/g, '');     // strip remaining non-ASCII
}

/**
 * Sanitise a full name into a `firstname.lastname` local-part.
 *
 * @param {string} fullName – raw name input
 * @returns {string} sanitised local-part (e.g. "mohammad.ahmad")
 */
export function sanitiseNameToLocal(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    throw new Error('Full name is required for email generation.');
  }

  const parts = transliterate(fullName.trim().toLowerCase())
    .split(/\s+/)                     // split on whitespace
    .map((p) => p.replace(/[^a-z0-9]/g, ''))  // keep only a-z, 0-9
    .filter(Boolean);                 // drop empty segments

  if (parts.length === 0) {
    throw new Error('Name must contain at least one Latin-translatable character.');
  }

  // firstname.lastname  (or just firstname if single word)
  const local = parts.join('.');

  // collapse consecutive dots, strip leading/trailing dots
  return local.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
}

/**
 * Generate a unique email address inside a SERIALIZABLE transaction.
 *
 * Uses advisory locks to prevent race conditions when two concurrent
 * inserts produce the same base email at the exact same time.
 *
 * @param {string} fullName – the student / user's full name
 * @param {object} [txSql]  – optional existing transaction sql object
 * @returns {Promise<string>} unique email address
 */
export async function generateUniqueEmail(fullName, txSql = null) {
  const localPart = sanitiseNameToLocal(fullName);
  const domain    = 'hub.com';
  const baseEmail = `${localPart}@${domain}`;

  // Use the provided transaction or fall back to top-level sql
  const q = txSql || sql;

  // Advisory lock keyed on the base email to serialise concurrent attempts
  // pg_advisory_xact_lock takes a bigint; we hash the base email.
  const lockKey = hashStringToInt(baseEmail);
  await q`SELECT pg_advisory_xact_lock(${lockKey})`;

  // Check if the base email is free
  const [existing] = await q`
    SELECT email FROM profiles WHERE email = ${baseEmail} LIMIT 1
  `;
  if (!existing) return baseEmail;

  // Find the highest numeric suffix already in use
  const pattern = `${localPart}%@${domain}`;
  const rows = await q`
    SELECT email FROM profiles
    WHERE email LIKE ${pattern}
      AND email ~ ${`^${escapeRegex(localPart)}[0-9]*@${escapeRegex(domain)}$`}
    ORDER BY email
  `;

  let maxSuffix = 0;
  for (const row of rows) {
    const local = row.email.split('@')[0];
    const suffix = local.slice(localPart.length);
    const num = suffix === '' ? 0 : parseInt(suffix, 10);
    if (!isNaN(num) && num >= maxSuffix) {
      maxSuffix = num + 1;
    }
  }

  return `${localPart}${maxSuffix}@${domain}`;
}

/* ── Internal helpers ─────────────────────────────────────── */

/** Simple non-crypto hash of a string → 32-bit signed integer (for pg_advisory_xact_lock). */
function hashStringToInt(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Escape special regex characters in a string. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
