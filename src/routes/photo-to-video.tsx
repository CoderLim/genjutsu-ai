import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * The development URL was previously noindex. Preserve existing bookmarks
 * with a permanent redirect to the public, canonical Image to Video page.
 */
export const Route = createFileRoute('/photo-to-video')({
  beforeLoad: () => {
    throw redirect({
      to: '/image-to-video',
      statusCode: 301,
      replace: true,
    });
  },
  component: () => null,
});
