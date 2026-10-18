import { createFileRoute } from '@tanstack/react-router';

import { resolveFixedTemplatePreviewUrl } from '@/modules/templates/preview';
import {
  isZombieHugAspectRatio,
  ZOMBIE_HUG_DEFAULT_ASPECT_RATIO,
  type ZombieHugAspectRatio,
} from '@/modules/zombie-hug/prompt';

async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const rawAspect = url.searchParams.get('aspect');
  const aspectRatio: ZombieHugAspectRatio = isZombieHugAspectRatio(rawAspect)
    ? rawAspect
    : ZOMBIE_HUG_DEFAULT_ASPECT_RATIO;

  try {
    const previewUrl = await resolveFixedTemplatePreviewUrl({
      product: 'zombie-hug',
      aspect: aspectRatio,
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: previewUrl,
        'Cache-Control': 'private, max-age=300',
        'X-Template-Source': 'r2',
        'X-Template-Product': 'zombie-hug',
        'X-Zombie-Hug-Aspect-Ratio': aspectRatio,
      },
    });
  } catch (error) {
    console.error('zombie-hug template preview unavailable:', error);
    return new Response(
      error instanceof Error
        ? error.message
        : 'Zombie hug template is not configured in R2',
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Template-Source': 'missing',
          'X-Template-Product': 'zombie-hug',
          'X-Zombie-Hug-Aspect-Ratio': aspectRatio,
        },
      }
    );
  }
}

export const Route = createFileRoute('/api/zombie-hug/template')({
  server: {
    handlers: { GET },
  },
});
