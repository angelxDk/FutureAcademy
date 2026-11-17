import { test, expect } from '@playwright/test';
test('public presentation, privacy and terms remain available without authentication', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/conhecer');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aulas, prazos e ideias');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacidade');
  await page.getByRole('link', { name: 'Termos', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Termos de uso');
  expect(errors).toEqual([]);
});
test('login validates input and exposes account recovery', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Informe seu e-mail.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Esqueci minha senha' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click();
  await expect(page.getByLabel('Seu nome', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
