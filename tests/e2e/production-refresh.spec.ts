import { test, expect } from '@playwright/test';

async function expectHealthyShell(page) {
  await expect(page.locator('body')).not.toContainText('O Te-connect encontrou um problema');
  await expect(page.locator('body')).not.toContainText('O aplicativo não conseguiu inicializar');
  await expect(page.locator('body')).not.toHaveText('');
}

test.describe('produção — proteção contra blank screen no refresh', () => {
  test('landing pública continua renderizada após refresh', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.tc-public')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expectHealthyShell(page);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('.tc-public')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
      await expectHealthyShell(page);
    }
  });

  test('ecrã de login continua acessível após refresh', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Acesso corporativo' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expectHealthyShell(page);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Acesso corporativo' })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
      await expectHealthyShell(page);
    }
  });
});
