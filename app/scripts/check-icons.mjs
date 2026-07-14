// Every icon name in the source must exist in the registry.
//
// Icon names aren't only written as icon('x') — they also travel as data
// (achievement tracks in store.js, drawer items in main.js, changelog entry
// types), and a name that isn't in the registry renders as nothing at all. That
// failure is invisible in a diff and easy to miss on screen, so it's asserted.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ICONS } from '../src/icons.js';

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})('src');

// icon('name' …) / iconSvg('name' …) / iconName: 'name' / icon: 'name'
// Also the helpers that take a name and pass it through to icon() — a name that
// travels via one of those is exactly the kind that goes stale unnoticed (all
// three onboarding badges sat on dead Material Symbols names for a while).
const PATTERNS = [
  /\bicon(?:Svg)?\(\s*'([^']+)'/g,
  /\biconName:\s*'([^']+)'/g,
  /\bicon:\s*'([^']+)'/g,
  /\bemptyState\(\s*'([^']+)'/g,
  /\bbadge\(\s*'([^']+)'/g,
];

const missing = [];
for (const file of files) {
  if (file.endsWith('icons.js')) continue;
  const src = readFileSync(file, 'utf8');
  for (const re of PATTERNS) {
    for (const [, name] of src.matchAll(re)) {
      if (!(name in ICONS)) missing.push(`${file}: "${name}"`);
    }
  }
}

if (missing.length) {
  console.error(`✗ ${missing.length} icon name(s) not in the registry:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ every icon name resolves (${Object.keys(ICONS).length} in the registry)`);
