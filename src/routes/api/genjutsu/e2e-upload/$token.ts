import { createFileRoute } from '@tanstack/react-router';

import {
  getGenjutsuE2EUpload,
  isGenjutsuE2EMockEnabled,
  saveGenjutsuE2EUpload,
} from '@/modules/genjutsu/e2e-mock';

function notFound() {
  return new Response('Not found', { status: 404 });
}

function responseForUpload(
  request: Request,
  token: string,
  includeBody: boolean
) {
  if (!isGenjutsuE2EMockEnabled()) return notFound();

  const upload = getGenjutsuE2EUpload(token);
  if (!upload) return notFound();

  const total = upload.bytes.byteLength;
  const range = request.headers.get('range');
  const commonHeaders = {
    'Content-Type': upload.contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: {
          ...commonHeaders,
          'Content-Range': `bytes */${total}`,
        },
      });
    }

    const start = match[1] ? Number(match[1]) : 0;
    const requestedEnd = match[2] ? Number(match[2]) : total - 1;
    const end = Math.min(requestedEnd, total - 1);

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start > end ||
      start >= total
    ) {
      return new Response(null, {
        status: 416,
        headers: {
          ...commonHeaders,
          'Content-Range': `bytes */${total}`,
        },
      });
    }

    const body = includeBody ? upload.bytes.slice(start, end + 1) : null;
    return new Response(body, {
      status: 206,
      headers: {
        ...commonHeaders,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${total}`,
      },
    });
  }

  return new Response(includeBody ? upload.bytes : null, {
    status: 200,
    headers: {
      ...commonHeaders,
      'Content-Length': String(total),
    },
  });
}

export const Route = createFileRoute('/api/genjutsu/e2e-upload/$token')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        if (!isGenjutsuE2EMockEnabled()) return notFound();

        try {
          await saveGenjutsuE2EUpload(params.token, request);
          return new Response(null, { status: 204 });
        } catch (error: any) {
          return new Response(error?.message || 'Upload failed', {
            status: 400,
          });
        }
      },
      GET: async ({ request, params }) =>
        responseForUpload(request, params.token, true),
      HEAD: async ({ request, params }) =>
        responseForUpload(request, params.token, false),
    },
  },
});
