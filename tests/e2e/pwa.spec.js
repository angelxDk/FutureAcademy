import { test, expect } from '@playwright/test';

test('PWA caches only the public shell and can reopen it without a connection', async ({ page, context }) => {
  await page.goto('/conhecer');
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    return (await fetch(link.href)).json();
  });
  expect(manifest).toMatchObject({ name: 'Future Academy', display: 'standalone', start_url: '/', scope: '/' });
  expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({ sizes: '192x192' }), expect.objectContaining({ sizes: '512x512', purpose: 'maskable' })]));
  const icons = await page.evaluate(async sources => Promise.all(sources.map(async src => {
    const image = await createImageBitmap(await (await fetch(src)).blob());
    return [image.width, image.height];
  })), manifest.icons.map(icon => icon.src));
  expect(icons).toEqual([[192, 192], [512, 512], [512, 512]]);

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.route('**/api/pwa-private-check', route => route.fulfill({ json: { private: 'student-material' } }));
  expect(await page.evaluate(async () => (await fetch('/api/pwa-private-check', { headers: { Authorization: 'Bearer test-only' } })).json())).toEqual({ private: 'student-material' });
  await page.unroute('**/api/pwa-private-check');
  const cached = await page.evaluate(async () => {
    const cachesByName = await caches.keys();
    return (await Promise.all(cachesByName.map(async name => (await (await caches.open(name)).keys()).map(request => request.url)))).flat();
  });
  expect(cached.length).toBeGreaterThan(0);
  expect(cached.every(url => {
    const { origin, pathname } = new URL(url);
    return origin === new URL(page.url()).origin && !pathname.startsWith('/api/') && !pathname.startsWith('/auth/');
  })).toBe(true);
  expect(cached.some(url => /studyAi\.worker|spelling\.worker|\/dictionaries\//.test(url))).toBe(false);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aulas, prazos e ideias');
  await expect(page.getByText('Você está sem conexão', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => fetch('/api/pwa-private-check').then(() => 'cached', () => 'unavailable'))).toBe('unavailable');
  await context.setOffline(false);
  await expect(page.getByText('Você está sem conexão', { exact: true })).toBeHidden();
});

test('installation is offered and invoked only after the student clicks', async ({ page }) => {
  await page.goto('/conhecer');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    window.pwaPromptCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: async () => { window.pwaPromptCalls++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
    window.dispatchEvent(event);
  });
  const banner = page.getByRole('complementary', { name: 'Aplicativo Future Academy' });
  await expect(banner.getByRole('button', { name: 'Instalar', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.pwaPromptCalls)).toBe(0);
  await banner.getByRole('button', { name: 'Instalar', exact: true }).click();
  expect(await page.evaluate(() => window.pwaPromptCalls)).toBe(1);
  await expect(banner).toBeHidden();
});
