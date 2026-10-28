import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Same landing as /shan-shen-bu — no separate page so shanshenbu and
 * shan-shen-bu do not compete for rankings.
 */
export const Route = createFileRoute('/shanshenbu')({
  beforeLoad: () => {
    throw redirect({
      href: '/shan-shen-bu',
      statusCode: 301,
      reloadDocument: true,
    });
  },
});
