import { createFileRoute, notFound } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';
import { Calendar } from 'lucide-react';

import { envConfigs } from '@/config';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { baseLocale, getLocale } from '@/paraglide/runtime.js';
import { BlogBreadcrumb } from '@/components/blog-breadcrumb';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { MarkdownContent } from '@/components/markdown-content';
import { mdxComponents } from '@/components/mdx-components';
import {
  formatPostDate,
  getLocalPostLocales,
  loadLocalPost,
} from '@/content/posts';
import { getBlogPostFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const locale = getLocale();
    const post = await getBlogPostFn({
      data: { slug: params.slug, locale },
    });
    if (!post) throw notFound();
    return { locale, post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, post } = loaderData;
    const title = `${post.title} | ${envConfigs.app_name}`;
    // A locale-specific URL can show fallback English content, but that is
    // not a translated article and must not be declared as one to crawlers.
    const availableLocales =
      post.source === 'local' ? getLocalPostLocales(post.slug) : [baseLocale];
    const contentLocale = availableLocales.includes(locale)
      ? locale
      : availableLocales.includes(baseLocale)
        ? baseLocale
        : (availableLocales[0] ?? baseLocale);
    const { canonical, alternates } = localeLinks(
      `/blog/${post.slug}`,
      contentLocale,
      availableLocales
    );
    const image = post.image ? absoluteUrl(post.image) : undefined;
    return {
      meta: [
        { title },
        { name: 'description', content: post.description },
        ...socialMeta({
          title,
          description: post.description,
          url: canonical,
          image,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.createdAt,
            dateModified: post.createdAt,
            inLanguage: contentLocale,
            mainEntityOfPage: canonical,
            ...(image ? { image: [image] } : {}),
            author: {
              '@type': 'Organization',
              name: post.authorName || envConfigs.app_name,
            },
            publisher: {
              '@type': 'Organization',
              name: envConfigs.app_name,
            },
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { locale, post } = Route.useLoaderData();

  // Local posts render their bundled MDX component; database posts render
  // raw markdown through MarkdownContent.
  const LocalContent =
    post.source === 'local' ? loadLocalPost(post.slug, locale)?.default : null;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 py-12 md:px-8 md:py-16">
        <article className="mx-auto max-w-3xl">
          <BlogBreadcrumb postTitle={post.title} className="mb-8" />

          <header className="border-border mb-6 border-b pb-6">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
              {post.title}
            </h1>
            {post.description && (
              <p className="text-muted-foreground mt-3">{post.description}</p>
            )}
            <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {formatPostDate(post.createdAt, locale)}
              </span>
              {(post.authorName || post.authorImage) && (
                <span className="inline-flex items-center gap-2">
                  {post.authorImage && (
                    <img
                      src={post.authorImage}
                      alt={post.authorName || ''}
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-cover"
                    />
                  )}
                  {post.authorName}
                </span>
              )}
            </div>
          </header>

          {post.image && (
            <div className="border-border mb-8 aspect-video max-h-[28rem] overflow-hidden rounded-2xl border">
              <img
                src={post.image}
                alt={post.title}
                className="size-full object-cover object-center"
              />
            </div>
          )}

          {LocalContent ? (
            <div className="text-foreground/90 text-[15px] leading-7">
              <MDXProvider components={mdxComponents}>
                <LocalContent />
              </MDXProvider>
            </div>
          ) : (
            <MarkdownContent content={post.content || ''} />
          )}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
