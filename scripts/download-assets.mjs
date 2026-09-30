#!/usr/bin/env node
/**
 * Download static assets from raphael.app for the landing clone.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = 'https://raphael.app';

const PATHS = [
  '/logo-64.webp',
  '/logo.webp',
  '/favicon/favicon.ico',
  '/favicon/favicon-16x16.png',
  '/favicon/apple-touch-icon.png',
  '/images/app-tools/image-editor.webp',
  '/images/app-tools/remove-background.webp',
  '/images/app-tools/image-expand.webp',
  '/images/app-tools/transform-style.webp',
  '/images/comparison-high.webp',
  '/images/promo/gpt-image-2-banner-desktop.webp',
  '/images/promo/gpt-image-2-banner-mobile.webp',
  '/images/logos/image-models/seedream.svg',
  '/images/logos/image-models/openai.svg',
  '/images/logos/video-models/seedance.svg',
  '/images/logos/video-models/google-g.svg',
  '/images/logos/video-models/kling-official.png',
  '/imgs/feature108-1-v2.webp',
  // fonts (next/font self-hosted Inter-like)
  '/_next/static/media/07ce98f0c2830616-s.p.woff2',
  '/_next/static/media/415f6059eaa8a4bb-s.p.woff2',
  '/_next/static/media/b41420708a9e334c-s.p.woff2',
  '/_next/static/media/af0f98f8abe3733a-s.p.woff2',
];

for (let i = 1; i <= 16; i++) PATHS.push(`/example-images/${i}.webp`);

for (const name of [
  'sophie-miller',
  'michael-chen',
  'sarah-wang',
  'david-liu',
  'emma-zhang',
  'kevin-wu',
  'jessica-li',
  'tom-anderson',
  'nina-patel',
]) {
  PATHS.push(`/testimonials/${name}.webp`);
}

function localPath(urlPath) {
  if (urlPath.startsWith('/_next/static/media/')) {
    const file = urlPath.split('/').pop();
    const weightMap = {
      '07ce98f0c2830616-s.p.woff2': 'font-sans-400.woff2',
      '415f6059eaa8a4bb-s.p.woff2': 'font-sans-500.woff2',
      'b41420708a9e334c-s.p.woff2': 'font-sans-600.woff2',
      'af0f98f8abe3733a-s.p.woff2': 'font-sans-700.woff2',
    };
    return join(ROOT, 'public/fonts', weightMap[file] || file);
  }
  return join(ROOT, 'public', urlPath.replace(/^\//, ''));
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(urlPath) {
  const dest = localPath(urlPath);
  if (await exists(dest)) {
    console.log('SKIP', dest.replace(ROOT + '/', ''));
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(BASE + urlPath);
  if (!res.ok) {
    console.error('FAIL', urlPath, res.status);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log('OK', dest.replace(ROOT + '/', ''), `(${buf.length}b)`);
}

async function main() {
  const concurrency = 6;
  let i = 0;
  async function worker() {
    while (i < PATHS.length) {
      const idx = i++;
      await downloadOne(PATHS[idx]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log('Done. Total paths:', PATHS.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
