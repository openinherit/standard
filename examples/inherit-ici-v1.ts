/**
 * INHERIT Canonical Identity (ICI) v1 — Reference Implementation
 *
 * Deterministic fingerprint algorithm for cross-document person matching.
 * Same inputs always produce the same fingerprint.
 *
 * Algorithm:
 * 1. If any required input is missing, return null
 * 2. Unicode NFC normalise all input strings
 * 3. ASCII-fold diacritics (ü→u, é→e, ñ→n, ø→o)
 * 4. Lowercase all characters
 * 5. Strip Unicode categories Z (whitespace), P (punctuation), S (symbols)
 * 6. Use only the first given name (before the first space)
 * 7. Concatenate: familyname|givenname|YYYY-MM-DD|cc
 */

// Simple ASCII folding map for common diacritics
const DIACRITIC_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
  'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ð': 'd', 'ñ': 'n',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ý': 'y', 'ÿ': 'y', 'þ': 'th',
  'ß': 'ss', 'ł': 'l', 'đ': 'd', 'ħ': 'h',
  'ı': 'i', 'ĳ': 'ij', 'ŀ': 'l', 'ŉ': 'n', 'ŋ': 'n',
  'œ': 'oe', 'ŧ': 't',
  // Uppercase variants
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
  'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
  'Ð': 'D', 'Ñ': 'N',
  'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
  'Ý': 'Y', 'Þ': 'TH',
  'Œ': 'OE', 'Ł': 'L', 'Đ': 'D', 'Ħ': 'H',
};

function asciiFold(str: string): string {
  return str.replace(/[^\x00-\x7F]/g, (char) => {
    return DIACRITIC_MAP[char] || char;
  });
}

function stripPunctuationAndSymbols(str: string): string {
  // Strip Unicode categories Z (separator), P (punctuation), S (symbol)
  // This regex matches common punctuation, whitespace, and symbols
  return str.replace(/[\s\p{P}\p{S}]/gu, '');
}

export interface IciComponents {
  familyName: string;
  givenName: string;
  dateOfBirth: string; // YYYY-MM-DD
  countryOfBirth: string; // ISO 3166-1 alpha-2
}

export interface IciResult {
  fingerprint: string | null;
  algorithm: 'inherit-ici-v1';
  components: Partial<IciComponents>;
}

/**
 * Compute an INHERIT Canonical Identity fingerprint.
 *
 * @param components - The identity components (familyName, givenName, dateOfBirth, countryOfBirth)
 * @returns The ICI result with fingerprint (or null if components are missing)
 */
export function computeFingerprint(components: Partial<IciComponents>): IciResult {
  const { familyName, givenName, dateOfBirth, countryOfBirth } = components;

  // Step 1: If any required input is missing, fingerprint is null
  if (!familyName || !givenName || !dateOfBirth || !countryOfBirth) {
    return { fingerprint: null, algorithm: 'inherit-ici-v1', components };
  }

  // Step 2: Unicode NFC normalise
  let fn = familyName.normalize('NFC');
  let gn = givenName.normalize('NFC');
  const dob = dateOfBirth;
  let cc = countryOfBirth.normalize('NFC');

  // Step 3: ASCII-fold diacritics
  fn = asciiFold(fn);
  gn = asciiFold(gn);

  // Step 4: Lowercase
  fn = fn.toLowerCase();
  gn = gn.toLowerCase();
  cc = cc.toLowerCase();

  // Step 5: Strip whitespace, punctuation, symbols
  fn = stripPunctuationAndSymbols(fn);
  gn = stripPunctuationAndSymbols(gn);

  // Step 6: First given name only (before first space — but spaces already stripped)
  // Since we strip whitespace in step 5, we need to do this BEFORE stripping
  // Redo: take first name before space, THEN strip
  const firstGivenName = givenName.split(/\s+/)[0];
  gn = stripPunctuationAndSymbols(asciiFold(firstGivenName.normalize('NFC')).toLowerCase());

  // Step 7: Concatenate with pipe delimiter
  const fingerprint = `${fn}|${gn}|${dob}|${cc}`;

  return { fingerprint, algorithm: 'inherit-ici-v1', components };
}

// === Self-test when run directly ===
if (process.argv[1]?.endsWith('inherit-ici-v1.ts') || process.argv[1]?.endsWith('inherit-ici-v1.js')) {
  let passed = 0;
  let failed = 0;

  function test(name: string, input: Partial<IciComponents>, expected: string | null) {
    const result = computeFingerprint(input);
    if (result.fingerprint === expected) {
      console.log(`  PASS  ${name}`);
      passed++;
    } else {
      console.log(`  FAIL  ${name}`);
      console.log(`        expected: ${expected}`);
      console.log(`        got:      ${result.fingerprint}`);
      failed++;
    }
  }

  console.log('=== inherit-ici-v1 Reference Implementation Tests ===\n');

  // Basic
  test('basic English name',
    { familyName: 'Ashford', givenName: 'James', dateOfBirth: '1965-04-12', countryOfBirth: 'GB' },
    'ashford|james|1965-04-12|gb');

  // Diacritics
  test('German name with umlaut (Müller → muller)',
    { familyName: 'Müller', givenName: 'Hans', dateOfBirth: '1970-08-22', countryOfBirth: 'DE' },
    'muller|hans|1970-08-22|de');

  test('French name with accents (Héloïse → heloise)',
    { familyName: 'Beaumont', givenName: 'Héloïse', dateOfBirth: '1985-01-15', countryOfBirth: 'FR' },
    'beaumont|heloise|1985-01-15|fr');

  test('Scandinavian (Ørsted → orsted)',
    { familyName: 'Ørsted', givenName: 'Lars', dateOfBirth: '1960-12-01', countryOfBirth: 'DK' },
    'orsted|lars|1960-12-01|dk');

  // Compound surnames
  test('hyphenated surname (O\'Brien-Smith → obriensmith)',
    { familyName: "O'Brien-Smith", givenName: 'Maria', dateOfBirth: '1975-06-30', countryOfBirth: 'IE' },
    'obriensmith|maria|1975-06-30|ie');

  // Multiple given names — use first only
  test('multiple given names (María del Carmen → maria)',
    { familyName: 'Garcia', givenName: 'María del Carmen', dateOfBirth: '1980-03-25', countryOfBirth: 'ES' },
    'garcia|maria|1980-03-25|es');

  // Single character name
  test('single character given name',
    { familyName: 'Lee', givenName: 'J', dateOfBirth: '1990-11-11', countryOfBirth: 'US' },
    'lee|j|1990-11-11|us');

  // Missing components
  test('missing familyName → null',
    { givenName: 'Suresh', dateOfBirth: '1985-01-15', countryOfBirth: 'IN' },
    null);

  test('missing givenName → null',
    { familyName: 'Patel', dateOfBirth: '1985-01-15', countryOfBirth: 'IN' },
    null);

  test('missing dateOfBirth → null',
    { familyName: 'Patel', givenName: 'Suresh', countryOfBirth: 'IN' },
    null);

  test('missing countryOfBirth → null',
    { familyName: 'Patel', givenName: 'Suresh', dateOfBirth: '1985-01-15' },
    null);

  // German double-s (ß → ss)
  test('eszett (Straße → strasse)',
    { familyName: 'Strauß', givenName: 'Johann', dateOfBirth: '1825-10-25', countryOfBirth: 'AT' },
    'strauss|johann|1825-10-25|at');

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`inherit-ici-v1 tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}
