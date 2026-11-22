#!/usr/bin/env node
/**
 * Guard editorial translations separately from Paraglide/MDX.
 *
 * Stable IDs protect against array reordering. The English source fingerprints
 * force translators to review content edits even when an existing ID is reused.
 * Update EXPECTED_ENGLISH_BLOCK_HASHES only alongside reviewed translations.
 */
import { readFile } from 'node:fs/promises';

const route = await readFile('src/routes/ai-rumpelstiltskin.tsx', 'utf8');
const translated = await readFile(
  'src/components/landing/rumpel-seo-i18n.ts',
  'utf8'
);
const groups = {
  faq: 'FAQ_ITEMS',
  steps: 'HOW_STEPS',
  locks: 'HAND_LOCKS',
  rules: 'RULES',
};
// English source revisions are acknowledged separately for each locale and item.
// These hashes do not prove linguistic correctness; reviewers must inspect changed translations.
const reviewed = JSON.parse(
  await readFile('scripts/i18n/rumpel-source-review.json', 'utf8')
);
const LOCALES = ['es', 'pt-BR', 'fr', 'de'];
const REQUIRED_SECTIONS = [
  'whatTitle',
  'whatP1',
  'whatP2',
  'whatP3',
  'imageAlt',
  'lostTitle',
  'lostP1',
  'lostP2',
  'three',
  'howTitle',
  'handTitle',
  'handIntro',
  'handLinkBefore',
  'handLink',
  'rulesTitle',
  'rulesBefore',
  'rulesLink',
  'faqTitle',
  'howToName',
  'articleAbout',
];

let errors = 0;
function assert(ok, message) {
  if (!ok) {
    console.error('INVALID rumpel SEO: ' + message);
    errors++;
  }
}
function fingerprint(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
/** TS object literals use bare keys / single quotes / trailing commas — not JSON. */
function tsLiteralToJson(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === "'" || c === '"') {
      const quote = c;
      i += 1;
      let value = '';
      while (i < source.length) {
        const ch = source[i];
        if (ch === '\\' && i + 1 < source.length) {
          value += ch + source[i + 1];
          i += 2;
          continue;
        }
        if (ch === quote) {
          i += 1;
          break;
        }
        value += ch;
        i += 1;
      }
      out += JSON.stringify(
        JSON.parse('"' + value.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"')
      );
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < source.length && /[\w$-]/.test(source[j])) j += 1;
      let k = j;
      while (k < source.length && /\s/.test(source[k])) k += 1;
      if (source[k] === ':') {
        out += '"' + source.slice(i, j) + '"';
        i = j;
        continue;
      }
    }
    if (c === ',') {
      let k = i + 1;
      while (k < source.length && /\s/.test(source[k])) k += 1;
      if (source[k] === '}' || source[k] === ']') {
        i += 1;
        continue;
      }
    }
    out += c;
    i += 1;
  }
  return out;
}
function jsonDeclaration(source, prefix, suffix) {
  const begin = source.indexOf(prefix);
  assert(begin !== -1, 'missing declaration ' + prefix);
  if (begin === -1) return null;
  const start = begin + prefix.length;
  const end = source.indexOf(suffix, start);
  assert(end !== -1, 'missing declaration terminator ' + suffix);
  if (end === -1) return null;
  try {
    return JSON.parse(tsLiteralToJson(source.slice(start, end)));
  } catch (e) {
    assert(false, 'malformed JSON declaration: ' + e.message);
    return null;
  }
}
const declaredIds = jsonDeclaration(
  translated,
  'export const RUMPEL_SEO_IDS = ',
  ' as const;'
);
const copies = jsonDeclaration(
  translated,
  'const copies: Record<string, RumpelSeoCopy> = ',
  ';\nexport function getRumpelSeoCopy'
);

if (declaredIds && copies) {
  for (const [group, sourceName] of Object.entries(groups)) {
    const blockMatch = route.match(
      new RegExp('const ' + sourceName + ' = \\[([\\s\\S]*?)\\] as const;')
    );
    assert(!!blockMatch, 'missing source array ' + sourceName);
    if (!blockMatch) continue;
    const englishIds = [...blockMatch[1].matchAll(/\bid:\s*'([^']+)'/g)].map(
      (m) => m[1]
    );
    const ids = declaredIds[group] ?? [];
    assert(
      new Set(englishIds).size === englishIds.length,
      sourceName + ' contains duplicate IDs'
    );
    assert(
      new Set(ids).size === ids.length,
      group + ' contains duplicate declared IDs'
    );
    assert(englishIds.length > 0, sourceName + ' has no keyed entries');
    assert(
      JSON.stringify([...englishIds].sort()) ===
        JSON.stringify([...ids].sort()),
      sourceName + ' IDs differ from translation IDs'
    );
    const englishItemHashes = Object.fromEntries(
      [...blockMatch[1].matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?\n  \},?/g)].map(
        (item) => [item[1], fingerprint(item[0].replace(/\s+/g, ' ').trim())]
      )
    );
    assert(
      Object.keys(englishItemHashes).length === englishIds.length,
      sourceName + ' could not fingerprint every English item'
    );
    for (const locale of LOCALES) {
      const dict = copies[locale]?.[group];
      assert(
        dict && typeof dict === 'object' && !Array.isArray(dict),
        locale + '/' + group + ' must be keyed by stable IDs'
      );
      if (!dict || Array.isArray(dict)) continue;
      assert(
        JSON.stringify(Object.keys(dict).sort()) ===
          JSON.stringify([...ids].sort()),
        locale + '/' + group + ' missing or extra IDs'
      );
      const acknowledgements = reviewed[locale]?.[sourceName];
      assert(
        acknowledgements &&
          JSON.stringify(Object.keys(acknowledgements).sort()) ===
            JSON.stringify([...ids].sort()),
        locale + '/' + sourceName + ' source-review IDs changed'
      );
      for (const id of ids) {
        assert(
          acknowledgements?.[id] === englishItemHashes[id],
          locale +
            '/' +
            sourceName +
            '/' +
            id +
            ' English source changed; review this translation and acknowledge its hash'
        );
        const value = dict[id];
        const valid =
          group === 'rules'
            ? typeof value === 'string' && value.trim().length > 0
            : Array.isArray(value) &&
              value.length === 2 &&
              value.every((s) => typeof s === 'string' && s.trim());
        assert(
          !!valid,
          locale + '/' + group + '/' + id + ' has invalid localized content'
        );
      }
    }
  }
  for (const locale of LOCALES) {
    const sections = copies[locale]?.sections;
    assert(
      sections && typeof sections === 'object',
      locale + ' missing article sections'
    );
    if (!sections) continue;
    assert(
      JSON.stringify(Object.keys(sections).sort()) ===
        JSON.stringify([...REQUIRED_SECTIONS].sort()),
      locale + ' editorial section keys changed'
    );
    for (const key of REQUIRED_SECTIONS) {
      assert(
        typeof sections[key] === 'string' && sections[key].trim().length > 0,
        locale + ' missing section ' + key
      );
    }
  }
}
assert(
  route.includes(
    "inLanguage: getRumpelSeoCopy(getLocale()) ? getLocale() : 'en'"
  ),
  'English editorial fallback must declare inLanguage en'
);
if (errors) process.exitCode = 1;
else
  console.log(
    'Rumpel SEO: four locales, keyed content and per-locale source acknowledgements verified.'
  );
