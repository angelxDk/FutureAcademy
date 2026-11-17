import { test, expect } from '@playwright/test';
test.skip(!process.env.E2E_SUPABASE, 'Requires the Auth-configured build from test:e2e:full.');

// No accounts or e-mails are created: the browser receives the same response
// shapes as hosted Auth, including the confirmation-required branch.
test.beforeEach(async ({ page }) => {
  await page.route('**/auth/v1/settings', route => route.fulfill({ json: { external: { email: true } } }));
});

test('an invalid login keeps its error visible and offers recovery by code', async ({ page }) => {
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ status: 400, json: { error_code: 'invalid_credentials', msg: 'Invalid login credentials' } }));
  let recoveryEmail = '';
  await page.route('**/auth/v1/recover*', route => {
    recoveryEmail = route.request().postDataJSON().email;
    return route.fulfill({ json: {} });
  });
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('student@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('old-password-test-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.');
  await expect(page.locator('.v-snackbar')).toBeHidden();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('student@example.com');
  await page.getByRole('button', { name: 'Esqueci minha senha', exact: true }).click();
  const recovery = page.getByRole('link', { name: 'Inserir código e criar nova senha' });
  await expect(recovery).toBeVisible();
  expect(recoveryEmail).toBe('student@example.com');
  await recovery.click();
  await expect(page.getByLabel('Código de recuperação', { exact: true })).toBeVisible();
});

test('a signup requiring confirmation explains the next step and can resend it', async ({ page }) => {
  await page.route('**/auth/v1/signup*', route => route.fulfill({ json: {
    id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'new-student@example.com', app_metadata: { provider: 'email' }, user_metadata: {},
    identities: [], created_at: '2026-11-16T12:00:00Z'
  } }));
  let resentTo = '';
  await page.route('**/auth/v1/resend*', route => {
    resentTo = route.request().postDataJSON().email;
    return route.fulfill({ json: {} });
  });
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click();
  await page.getByLabel('Seu nome', { exact: true }).fill('Estudante');
  await page.getByLabel('E-mail', { exact: true }).fill('new-student@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('new-password-test-123');
  await page.getByLabel('Confirme sua senha', { exact: true }).fill('new-password-test-123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('.entrance-feedback')).toContainText('e-mail');
  const resend = page.getByRole('button', { name: 'Reenviar confirmação de e-mail', exact: true });
  await expect(resend).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill('different@example.com');
  await expect(resend).toBeHidden();
  await page.getByLabel('E-mail', { exact: true }).fill('new-student@example.com');
  await resend.click();
  await expect.poll(() => resentTo).toBe('new-student@example.com');
  await expect(page.locator('.entrance-feedback')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
