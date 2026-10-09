import { createFileRoute } from '@tanstack/react-router';

import { getZombieHugTemplatePreviewUrl } from '@/modules/genjutsu/storage';
import { ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH } from '@/modules/zombie-hug/prompt';

async function GET() {
  try {
    const url = await getZombieHugTemplatePreviewUrl();
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Cache-Control': 'public, max-age=300',
        // Same object generation will seal from R2.
        'X-Zombie-Hug-Template-Source': 'r2',
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
        Location: ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH,
        'Cache-Control': 'public, max-age=60',
        'X-Zombie-Hug-Template-Source': 'public-fallback',
      },
    });
  }
}

export const Route = createFileRoute('/api/zombie-hug/template')({
  server: {
    handlers: { GET },
  },
});
