import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  { path: '', title: 'Home', description: 'Landing page' },
  { path: '/pricing', title: 'Pricing', description: 'Pricing plans' },
  {
    path: '/hotel-lobby-ai',
    title: 'Hotel Lobby AI Video Generator',
    description: 'Preset two-photo Hotel Lobby AI video generator',
  },
  {
    path: '/bulin-47-ai',
    title: 'Bulin 47 AI Video',
    description: 'One-photo Bulin 47 freestyle AI video generator',
  },
  {
    path: '/coldplay-kiss-cam',
    title: 'Coldplay Kiss Cam AI Video',
    description:
      'Two-photo stadium kiss-cam AI video generator (fixed circular overlay template)',
  },
  {
    path: '/a2o-lite-ai',
    title: 'A2O LITE AI Video Generator',
    description:
      'Two-photo A2O LITE NEON-style AI dance video generator (fixed duo template)',
  },
  {
    path: '/enzo-fernandez-ai',
    title: 'Enzo Fernandez AI Video',
    description:
      'One-photo stadium celebration AI video generator (fixed template)',
  },
  {
    path: '/flying-car-ai',
    title: 'Flying Car AI Video',
    description:
      'One-photo flying-car loop-ramp AI video generator (fixed template)',
  },
  {
    path: '/crazy-frog-ai',
    title: 'Crazy Frog AI Video',
    description: 'Two-photo Crazy Frog chase AI video generator',
  },
  {
    path: '/gas-station-dance-ai',
    title: 'Gas Station Dance AI Generator',
    description:
      'Three-photo gas station dance AI video generator (dance, selfie, car exit)',
  },
  {
    path: '/kairo-bad-times',
    title: 'Kairo Bad Times AI Video',
    description: 'One-photo Kairo Bad Times motion-template AI video generator',
  },
  {
    path: '/smalltown-boy-dance',
    title: 'Smalltown Boy Dance',
    description:
      '2026 guide to the Smalltown Boy TikTok dance trend, step-by-step moves, CapCut and AI dual-dancer video',
  },
  {
    path: '/ai-zombie-hug',
    title: 'AI Zombie Hug',
    description: 'Motion-transfer Zombie Hug AI video generator',
  },
  {
    path: '/ai-rumpelstiltskin',
    title: 'Rumpelstiltskin AI Video',
    description: 'One-photo Rumpelstiltskin tiptoe AI video generator',
  },
  { path: '/blog', title: 'Blog', description: 'Blog posts and articles' },
];

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { app_url, app_name, app_description } = envConfigs;

        let posts = getLocalPosts(baseLocale);
        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const rows = await listPublishedArticles().catch(() => []);
          const dbPosts = rows.map((row) => ({
            slug: row.slug,
            title: row.title || row.slug,
            description: row.description || '',
            createdAt: new Date(row.createdAt).toISOString(),
            source: 'db' as const,
          }));
          posts = mergePosts(dbPosts, posts);
        } catch {
          // Database unreachable — local posts still listed.
        }

        const lines: string[] = [
          `# ${app_name}`,
          '',
          `> ${app_description}`,
          '',
          '## Pages',
          '',
          ...STATIC_PAGES.map(
            (p) => `- [${p.title}](${app_url}${p.path}): ${p.description}`
          ),
        ];

        if (posts.length > 0) {
          lines.push('', '## Blog Posts', '');
          for (const post of posts) {
            lines.push(
              `- [${post.title}](${app_url}/blog/${post.slug}): ${post.description}`
            );
          }
        }

        lines.push('');

        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
