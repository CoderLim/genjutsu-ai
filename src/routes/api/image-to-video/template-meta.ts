import { createFileRoute } from '@tanstack/react-router';

import {
  getImageToVideoPresetPublicMeta,
  ImageToVideoPreflightError,
  resolveImageToVideoPreset,
} from '@/modules/image-to-video/presets';
import { estimateImageToVideoCredits } from '@/modules/image-to-video/pricing';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const presetId =
      new URL(request.url).searchParams.get('presetId') || 'day-of-the-dead';
    const preset = resolveImageToVideoPreset(presetId);
    const meta = getImageToVideoPresetPublicMeta(presetId);
    const estimatedCredits = estimateImageToVideoCredits({
      duration: preset.defaultDuration,
      resolution: preset.defaultResolution,
    });

    return respData({
      ...meta,
      estimatedCredits,
    });
  } catch (error: any) {
    if (error instanceof ImageToVideoPreflightError) {
      return respErr(error.message, { status: 400 });
    }
    return respErr(error?.message || 'Failed to load preset meta', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/image-to-video/template-meta')({
  server: {
    handlers: { GET },
  },
});
