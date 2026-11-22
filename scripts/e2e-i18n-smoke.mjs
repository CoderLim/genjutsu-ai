import assert from 'node:assert/strict';

/** Browser-independent SSR smoke test against the running Vite E2E server. */
export async function checkLocalizedPages(baseUrl) {
  const locales = ['es', 'pt-BR', 'fr', 'de'];
  const translatedPaths = [
    '/',
    '/pricing',
    '/ai-rumpelstiltskin',
    '/terms-of-service',
  ];

  async function htmlFor(path) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, 200, path + ': expected HTTP 200');
    return response.text();
  }

  function canonicalTag(html) {
    return html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || '';
  }

  for (const locale of locales) {
    for (const path of translatedPaths) {
      const localPath = '/' + locale + (path === '/' ? '' : path);
      const html = await htmlFor(localPath);
      assert.ok(
        html.includes('lang="' + locale + '"') ||
          html.includes("lang='" + locale + "'"),
        localPath + ': wrong HTML language'
      );
      const expected = baseUrl + localPath;
      assert.ok(
        canonicalTag(html).includes(expected),
        localPath +
          ': missing self canonical ' +
          expected +
          ': ' +
          canonicalTag(html)
      );
    }

    for (const path of ['/bulin-47-ai']) {
      const localPath = '/' + locale + path;
      // Do not serve English editorial text as a 200 response with a
      // misleading non-English HTML language. Redirect to the English URL.
      const redirectResponse = await fetch(baseUrl + localPath, {
        redirect: 'manual',
      });
      assert.equal(
        redirectResponse.status,
        307,
        localPath + ': expected 307 redirect to English'
      );
      assert.equal(
        new URL(redirectResponse.headers.get('location'), baseUrl).pathname,
        path,
        localPath + ': wrong redirect target'
      );
      const html = await htmlFor(path);
      assert.match(
        html,
        /<html[^>]*lang=["']en["']/i,
        path + ': English editorial document language'
      );
      assert.ok(
        canonicalTag(html).includes(baseUrl + path),
        path + ': English editorial canonical'
      );
      assert.ok(
        !/hreflang=["'](?:es|pt-BR|fr|de)["']/.test(html),
        path + ': English-only content must not advertise translated alternates'
      );
    }
  }

  const response = await fetch(baseUrl + '/sitemap.xml');
  assert.equal(response.status, 200);
  const xml = await response.text();
  for (const locale of locales) {
    assert.ok(
      xml.includes(baseUrl + '/' + locale + '/ai-rumpelstiltskin'),
      locale + ': missing translated Rumpelstiltskin sitemap entry'
    );
    assert.ok(
      !xml.includes(baseUrl + '/' + locale + '/bulin-47-ai'),
      locale + ': English Bulin article incorrectly indexed'
    );
  }
  console.log('✅ i18n SSR: locales, canonical and sitemap checks passed');
}
