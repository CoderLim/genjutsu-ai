import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

const RESULTS = new Set(['success', 'failed', 'skipped']);
const MODES = new Set(['original', 'materialized']);
const ERROR_CODES = new Set([
  'file_read_error',
  'file_size_out_of_range',
  'file_prepare_error',
  'unknown',
]);
const SIZE_BUCKETS = new Set([
  '0-256KB',
  '256KB-1MB',
  '1-3MB',
  '3-6MB',
  '6-12MB',
  '12MB+',
  'unknown',
]);
const BROWSERS = new Set([
  'Edge',
  'Opera',
  'Chrome',
  'Firefox',
  'Safari',
  'Samsung',
  'Other',
]);
const OSES = new Set([
  'iOS',
  'Android',
  'Windows',
  'macOS',
  'Linux',
  'ChromeOS',
  'Other',
]);

const MAX_BATCH_ITEMS = 8;

type ParsedPrepEvent = {
  result: string;
  preparationMode: string;
  errorCode: string | null;
  fileSizeBucket: string | null;
  product: string;
  browser: string | null;
  browserMajor: number | null;
  os: string | null;
  isWebView: boolean | null;
  sampled: boolean;
};

function parsePrepItem(raw: unknown): ParsedPrepEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;

  const result =
    typeof input.result === 'string' && RESULTS.has(input.result)
      ? input.result
      : null;
  const preparationMode =
    typeof input.preparationMode === 'string' &&
    MODES.has(input.preparationMode)
      ? input.preparationMode
      : null;
  if (!result || !preparationMode) return null;

  const errorCode =
    input.errorCode == null
      ? null
      : typeof input.errorCode === 'string' && ERROR_CODES.has(input.errorCode)
        ? input.errorCode
        : null;
  if (result === 'failed' && !errorCode) return null;

  const fileSizeBucket =
    typeof input.fileSizeBucket === 'string' &&
    SIZE_BUCKETS.has(input.fileSizeBucket)
      ? input.fileSizeBucket
      : null;
  const product =
    typeof input.product === 'string' &&
    /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(input.product)
      ? input.product.slice(0, 64)
      : 'genjutsu';
  const browser =
    typeof input.browser === 'string' && BROWSERS.has(input.browser)
      ? input.browser
      : null;
  const browserMajorRaw = Number(input.browserMajor);
  const browserMajor =
    Number.isInteger(browserMajorRaw) &&
    browserMajorRaw > 0 &&
    browserMajorRaw < 1_000
      ? browserMajorRaw
      : null;
  const os =
    typeof input.os === 'string' && OSES.has(input.os) ? input.os : null;
  const isWebView =
    typeof input.isWebView === 'boolean' ? input.isWebView : null;
  const sampled = input.sampled === true;

  return {
    result,
    preparationMode,
    errorCode,
    fileSizeBucket,
    product,
    browser,
    browserMajor,
    os,
    isWebView,
    sampled,
  };
}

/**
 * Lightweight diagnostic sink for image preparation (pre-attempt).
 * Does not create ai_task rows or touch credits — CF logs only.
 * Accepts a single event or a small batch (multi-slot select).
 */
async function POST({ request }: { request: Request }) {
  // Batched client posts: keep interval, but one request can carry up to 8 items.
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 500,
    keyPrefix: 'genjutsu-upload-prep-event',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return respErr('Invalid body', { status: 400 });
    }
    const input = body as Record<string, unknown>;

    let itemsRaw: unknown[] = [];
    if (input.event === 'upload_file_preparation_batch') {
      if (!Array.isArray(input.items) || input.items.length === 0) {
        return respErr('Invalid batch', { status: 400 });
      }
      itemsRaw = input.items.slice(0, MAX_BATCH_ITEMS);
    } else if (input.event === 'upload_file_preparation') {
      itemsRaw = [input];
    } else {
      return respErr('Invalid event', { status: 400 });
    }

    const parsed: ParsedPrepEvent[] = [];
    for (const item of itemsRaw) {
      const row = parsePrepItem(item);
      if (!row) return respErr('Invalid preparation fields', { status: 400 });
      parsed.push(row);
    }

    const cf = (
      request as Request & {
        cf?: { country?: unknown; colo?: unknown; asn?: unknown };
      }
    ).cf;
    const cfCountry =
      typeof cf?.country === 'string' ? cf.country.slice(0, 8) : null;
    const cfColo = typeof cf?.colo === 'string' ? cf.colo.slice(0, 8) : null;
    const cfAsn =
      typeof cf?.asn === 'number' && Number.isInteger(cf.asn) && cf.asn >= 0
        ? cf.asn
        : null;

    for (const row of parsed) {
      // Structured log for ops. No filenames, paths, or body.
      console.info(
        JSON.stringify({
          kind: 'upload_prep_event',
          requestKind: 'upload_prep_event',
          userId: session.user.id,
          ...row,
          cfCountry,
          cfColo,
          cfAsn,
        })
      );
    }

    return respData({ recorded: true, count: parsed.length });
  } catch (error) {
    console.error('genjutsu upload-prep-event failed:', error);
    return respErr('Failed to record event', { status: 500 });
  }
}

export const Route = createFileRoute('/api/genjutsu/upload-prep-event')({
  server: {
    handlers: { POST },
  },
});
