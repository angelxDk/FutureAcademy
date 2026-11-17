import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.skip(!process.env.E2E_SUPABASE, 'Requires isolated local Supabase.');

test('the study desk gives the notebook room and preserves writing when changing support tools', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const email = `desk-${testInfo.project.name}-${Date.now()}@example.com`, password = 'desk-test-password-123';
  const created = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Estudante' } });
  if (created.error) throw created.error;
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText('Monte seu fichário em três passos')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: true });
    await page.getByRole('button', { name: 'Mudar para claro', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.v-snackbar')).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('dashboard-light.png'), fullPage: true });
    await page.getByRole('button', { name: 'Mudar para escuro', exact: true }).click();
    await page.getByRole('button', { name: 'Mesa de estudo', exact: true }).click();
    await expect(page.locator('.app-root--desk')).toBeVisible();
    const notebook = page.getByRole('article', { name: 'Caderno', exact: true });
    const tutor = page.getByRole('article', { name: 'IA de estudo', exact: true });
    await expect(notebook).toBeVisible(); await expect(tutor).toBeHidden();
    await page.getByRole('tab', { name: 'IA de estudo', exact: true }).click();
    await expect(tutor).toBeVisible();
    await expect(tutor.locator('.assistant-configuration')).not.toHaveAttribute('open');
    await expect(tutor.getByRole('button', { name: 'Configurar IA', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Caderno', exact: true }).click();
    await notebook.getByLabel('Título da página', { exact: true }).fill('Meu espaço de estudo');
    const editor = notebook.getByRole('textbox', { name: 'Conteúdo do caderno', exact: true });
    await editor.fill('A área de escrita precisa continuar disponível ao trocar de ferramenta.');
    await editor.evaluate(element => { element.dataset.deskPreserved = 'yes'; });
    if (testInfo.project.name === 'desktop') {
      const bounds = await notebook.boundingBox();
      expect(bounds.width).toBeGreaterThan(1750);
      expect(bounds.height).toBeGreaterThan(650);

    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.v-snackbar')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('study-desk-dark.png'), fullPage: true });
    await page.getByRole('tab', { name: 'Pomodoro', exact: true }).click();
    const timer = page.getByRole('article', { name: 'Pomodoro', exact: true });
    await expect(timer.getByRole('heading', { name: 'Tempo restante' })).toHaveText('25:00');
    await expect(timer.locator('.pomodoro-configuration')).not.toHaveAttribute('open');
    await page.getByRole('button', { name: 'Dividir tela', exact: true }).click();
    await expect(timer).toBeVisible(); await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute('data-desk-preserved', 'yes');
    await expect(editor).toContainText('A área de escrita precisa continuar disponível');
    await page.getByRole('button', { name: 'Uma ferramenta', exact: true }).click();
    await expect(notebook).toBeHidden();
    await page.getByRole('tab', { name: 'Caderno', exact: true }).click();
    await expect(editor).toBeVisible();
    await page.getByRole('button', { name: 'Sair da mesa', exact: true }).click();
    await expect(page.locator('.app-root--desk')).toHaveCount(0);
    await page.goto('/records');
    const longTitle = 'Estudo: Explique o conceito de ressonância musical com exemplos e depois';
    const longText = ('Em termos musicais, uma nota pode responder à vibração de outra. '.repeat(100)) + ' https://example.com/' + 'x'.repeat(500);
    await page.getByLabel('Título da página', { exact: true }).fill(longTitle);
    await page.getByRole('textbox', { name: 'Conteúdo do caderno', exact: true }).fill(longText);
    for (const compact of [false, true]) {
      const toggle = page.getByRole('button', { name: compact ? 'Recolher menu lateral' : 'Expandir menu lateral', exact: true });
      if (await toggle.isVisible()) await toggle.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const bounds = await page.locator('.record-writing-card').boundingBox();
      expect(bounds.x + bounds.width).toBeLessThanOrEqual((await page.viewportSize()).width);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('long-notebook.png'), fullPage: true });
  } finally { await client.auth.admin.deleteUser(created.data.user.id); }
});
