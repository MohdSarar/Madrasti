import { test, expect } from '@playwright/test';

test('should show login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('text=Madrasti')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('should login successfully (mocked)', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test_access',
        refresh_token: 'test_refresh',
        user: { id: 'u1', email: 'user@test.com' }
      })
    });
  });

  await page.goto('/login');
  await page.fill('input[type="email"]', 'user@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Tableau de bord')).toBeVisible();
});
