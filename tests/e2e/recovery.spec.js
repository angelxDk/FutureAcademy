import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
test.skip(!process.env.E2E_SUPABASE, 'Requires isolated local Supabase.');
test('a recovery code works in another browser and the new password can sign in', async ({ page }, testInfo) => {
  test.setTimeout(45000);
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const email = `recovery-${testInfo.project.name}-${Date.now()}@example.com`;
  const created = await client.auth.admin.createUser({ email, password: 'old-password-test-123', email_confirm: true });
  if (created.error) throw created.error;
  try {
    const link = await client.auth.admin.generateLink({ type: 'recovery', email });
    if (link.error) throw link.error;
    await page.goto('/redefinir-senha');
    await page.getByLabel('E-mail da conta', { exact: true }).fill(email);
    await page.getByLabel('Código de recuperação', { exact: true }).fill(link.data.properties.email_otp);
    await page.getByLabel('Nova senha', { exact: true }).fill('new-password-test-456');
    await page.getByLabel('Confirme a nova senha', { exact: true }).fill('new-password-test-456');
    await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
    await expect(page).toHaveURL(/entrar\?senha=atualizada/);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('new-password-test-456');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
  } finally { await client.auth.admin.deleteUser(created.data.user.id); }
});
