/** Normalize skill / command names for comparison. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Strip boilerplate suffixes that inflate Levenshtein similarity without
 * implying the same concept (e.g. *-driven-development).
 */
const BOILERPLATE_SUFFIXES = [
  '-driven-development',
  '-development',
  '-optimization',
  '-implementation',
];

export function stemName(name: string): string {
  let n = normalizeName(name);
  for (const suffix of BOILERPLATE_SUFFIXES) {
    if (n.endsWith(suffix) && n.length > suffix.length + 2) {
      n = n.slice(0, -suffix.length);
      break;
    }
  }
  return n.replace(/^-+|-+$/g, '');
}

const STOP_TOKENS = new Set([
  'driven',
  'development',
  'using',
  'and',
  'the',
  'for',
  'with',
  'from',
  'into',
  'skill',
  'skills',
]);

/** Significant tokens from a skill name (length ≥ 4, not stop words). */
export function significantTokens(name: string): Set<string> {
  const tokens = normalizeName(name)
    .split('-')
    .filter((t) => t.length >= 4 && !STOP_TOKENS.has(t));
  return new Set(tokens);
}

export function sharesSignificantToken(a: string, b: string): boolean {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  for (const x of ta) {
    for (const y of tb) {
      if (x === y) return true;
      // Prefix match for plurals / conjugations (worktree/worktrees, request/requesting)
      if (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))) {
        return true;
      }
    }
  }
  return false;
}

/** Tokenize a description into significant lowercase words. */
export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return new Set(words);
}

/** Classic Levenshtein distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j] ?? 0;
    }
  }
  return prev[b.length] ?? 0;
}

/**
 * Normalized similarity in [0, 1] based on Levenshtein over stemmed names.
 * Exact normalized equality → 1.
 * Fuzzy matches below 1 require a shared significant token, otherwise 0.
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;

  const sa = stemName(a);
  const sb = stemName(b);
  if (sa === sb && sa.length > 0) {
    return sharesSignificantToken(a, b) ? 0.95 : 0;
  }

  const maxLen = Math.max(sa.length, sb.length);
  if (maxLen === 0) return 0;
  const raw = 1 - levenshtein(sa, sb) / maxLen;

  // Fuzzy-only: require a shared significant token to avoid
  // subagent-driven-development ≈ spec-driven-development noise.
  if (raw < 1 && !sharesSignificantToken(a, b)) return 0;
  return raw;
}

/** Count shared tokens between two descriptions that appear in a keyword allowlist. */
export function sharedKeywords(
  descA: string,
  descB: string,
  keywords: string[],
): string[] {
  const tokensA = tokenize(descA);
  const tokensB = tokenize(descB);
  const found: string[] = [];
  for (const kw of keywords) {
    const parts = kw.toLowerCase().split(/[\s-]+/);
    const inA =
      tokensA.has(kw.toLowerCase()) ||
      parts.every((p) => tokensA.has(p)) ||
      descA.toLowerCase().includes(kw.toLowerCase());
    const inB =
      tokensB.has(kw.toLowerCase()) ||
      parts.every((p) => tokensB.has(p)) ||
      descB.toLowerCase().includes(kw.toLowerCase());
    if (inA && inB) found.push(kw);
  }
  return found;
}
