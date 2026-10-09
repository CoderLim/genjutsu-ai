import { createFileRoute } from '@tanstack/react-router';

import { getZombieHugTemplatePreviewUrl } from '@/modules/genjutsu/storage';
import {
  getZombieHugPublicTemplatePath,
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
    const previewUrl = await getZombieHugTemplatePreviewUrl(aspectRatio);
    return new Response(null, {
      status: 302,
      headers: {
        Location: previewUrl,
        'Cache-Control': 'public, max-age=300',
        // Same object generation will seal from R2.
        'X-Zombie-Hug-Template-Source': 'r2',
        'X-Zombie-Hug-Aspect-Ratio': aspectRatio,
      },
    });
  } catch (error) {
    // Preview-only fallback. Generation still requires the R2 object and
    // returns TEMPLATE_NOT_CONFIGURED when it is missing on Workers.
    console.warn(
      'zombie-hug R2 template unavailable, preview falling back to public file:',
      error
    );
    return new Response(null, {
      status: 302,
      headers: {
        Location: getZombieHugPublicTemplatePath(aspectRatio),
        'Cache-Control': 'public, max-age=60',
        'X-Zombie-Hug-Template-Source': 'public-fallback',
        'X-Zombie-Hug-Aspect-Ratio': aspectRatio,
      },
    });
  }
}

export const Route = createFileRoute('/api/zombie-hug/template')({
  server: {
    handlers: { GET },
  },
});
