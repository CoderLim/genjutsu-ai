#!/usr/bin/env node
// Minimal GA id injector: writes the GA4 measurement id into the config table
// (or a local file) used by the launch pipeline. Safe no-op when no id given.
import { writeFileSync } from 'node:fs';

const gaId = process.argv[2];
if (!gaId) {
  console.log('set-ga-id: no GA id provided, skipping');
  process.exit(0);
}

const out = 'scripts/.ga-id.json';
writeFileSync(out, JSON.stringify({ ga4: gaId }, null, 2));
console.log(`set-ga-id: wrote ${gaId} to ${out}`);
