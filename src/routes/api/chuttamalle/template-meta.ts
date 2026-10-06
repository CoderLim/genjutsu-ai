import { createFileRoute } from '@tanstack/react-router';

import { getChuttamalleTemplateDurationSecondsRaw } from '@/modules/chuttamalle/storage';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    const durationSeconds = await getChuttamalleTemplateDurationSecondsRaw();
    return respData({ durationSeconds });
  } catch (error) {
    console.error('chuttamalle template duration unavailable:', error);
    return respErr(
      error instanceof Error
        ? error.message
        : 'Chuttamalle template duration is unavailable',
      { status: 404 }
    );
  }
}

export const Route = createFileRoute('/api/chuttamalle/template-meta')({
  server: {
    handlers: { GET },
  },
});
